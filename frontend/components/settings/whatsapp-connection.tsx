"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, Link2, LoaderCircle, RefreshCw } from "lucide-react";
import { clientEnv } from "@/lib/env/client";

type ConnectionView = {
  status: string;
  onboardingType: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  historySyncRequestedAt: string | null;
  lastError: string | null;
};

type FacebookLoginResponse = {
  authResponse?: { code?: string };
  status?: string;
};

type EmbeddedSignupData = {
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
  onboardingType?: "standard" | "coexistence";
};

declare global {
  interface Window {
    FB?: {
      init(input: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }): void;
      login(
        callback: (response: FacebookLoginResponse) => void,
        options: Record<string, unknown>,
      ): void;
    };
    fbAsyncInit?: () => void;
  }
}

const allowedMetaOrigins = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
]);

export function WhatsAppConnection({
  initialConnection,
  embeddedSignupConfigured,
  manualCloudApiConfigured,
  webhookConfigured,
  signatureVerificationConfigured,
  connectionError,
}: {
  initialConnection: ConnectionView | null;
  embeddedSignupConfigured: boolean;
  manualCloudApiConfigured: boolean;
  webhookConfigured: boolean;
  signatureVerificationConfigured: boolean;
  connectionError: string | null;
}) {
  const [connection, setConnection] = useState(initialConnection);
  const [mode, setMode] = useState<"standard" | "coexistence">("coexistence");
  const [pin, setPin] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(connectionError);
  const codeRef = useRef<string | null>(null);
  const signupRef = useRef<EmbeddedSignupData | null>(null);
  const connectingRef = useRef(false);

  const finishConnection = useCallback(async () => {
    const code = codeRef.current;
    const signup = signupRef.current;
    if (!code || !signup?.wabaId || connectingRef.current) return;

    connectingRef.current = true;
    setIsWorking(true);
    setStatus("Finalizing Meta connection...");

    try {
      const response = await fetch("/api/integrations/whatsapp/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          wabaId: signup.wabaId,
          phoneNumberId: signup.phoneNumberId,
          businessId: signup.businessId,
          onboardingType: signup.onboardingType ?? mode,
          pin: mode === "standard" ? pin : undefined,
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        connection?: ConnectionView;
      };
      if (!response.ok || !payload.success || !payload.connection) {
        throw new Error(payload.error ?? "Could not connect WhatsApp");
      }

      setConnection(payload.connection);
      setStatus(
        payload.connection.onboardingType === "coexistence"
          ? "Connected. Meta is syncing contacts and chat history."
          : "WhatsApp number connected.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Connection failed");
    } finally {
      codeRef.current = null;
      signupRef.current = null;
      connectingRef.current = false;
      setIsWorking(false);
    }
  }, [mode, pin]);

  useEffect(() => {
    if (!clientEnv.metaAppId) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: clientEnv.metaAppId as string,
        cookie: true,
        xfbml: false,
        version: clientEnv.whatsappApiVersion,
      });
      setSdkReady(Boolean(window.FB));
    };

    if (window.FB) {
      window.fbAsyncInit();
      return;
    }

    const existing = document.getElementById("facebook-jssdk");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!allowedMetaOrigins.has(event.origin)) return;

      let payload: unknown = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== "object") return;

      const session = payload as {
        type?: string;
        event?: string;
        data?: {
          waba_id?: string;
          phone_number_id?: string;
          business_id?: string;
        };
      };
      if (session.type !== "WA_EMBEDDED_SIGNUP") return;

      if (session.event === "CANCEL") {
        setIsWorking(false);
        setStatus("Meta signup was cancelled.");
        return;
      }

      if (
        session.event !== "FINISH" &&
        session.event !== "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        return;
      }

      signupRef.current = {
        wabaId: session.data?.waba_id,
        phoneNumberId: session.data?.phone_number_id,
        businessId: session.data?.business_id,
        onboardingType:
          session.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
            ? "coexistence"
            : "standard",
      };
      void finishConnection();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [finishConnection]);

  function launchSignup() {
    if (!window.FB || !clientEnv.whatsappEmbeddedSignupConfigId) {
      setStatus("Meta Embedded Signup is not configured.");
      return;
    }
    if (mode === "standard" && !/^\d{6}$/.test(pin)) {
      setStatus("Enter a 6-digit two-step verification PIN.");
      return;
    }

    codeRef.current = null;
    signupRef.current = null;
    setIsWorking(true);
    setStatus(null);

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (!code) {
          setIsWorking(false);
          setStatus("Meta did not return an authorization code.");
          return;
        }
        codeRef.current = code;
        void finishConnection();
      },
      {
        config_id: clientEnv.whatsappEmbeddedSignupConfigId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          version: "v3",
          setup: {},
          features: [],
          ...(mode === "coexistence"
            ? { featureType: "whatsapp_business_app_onboarding" }
            : {}),
        },
      },
    );
  }

  async function retryConnection() {
    setIsWorking(true);
    setStatus(null);
    try {
      const response = await fetch("/api/integrations/whatsapp/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retry: true, pin: pin || undefined }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        connection?: ConnectionView;
      };
      if (!response.ok || !payload.connection) {
        throw new Error(payload.error ?? "Retry failed");
      }
      setConnection(payload.connection);
      setStatus("WhatsApp connection completed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Retry failed");
    } finally {
      setIsWorking(false);
    }
  }

  const connected = connection?.status === "connected";
  const environmentConnected = !connection && manualCloudApiConfigured;

  return (
    <section className="panel whatsapp-settings-panel">
      <div className="settings-panel-header">
        <div>
          <h2>WhatsApp</h2>
          <p className="helper-text">
            {connection?.verifiedName ??
              connection?.displayPhoneNumber ??
              (environmentConnected ? "Cloud API credentials" : "No business number")}
          </p>
        </div>
        <span
          className={`status-badge ${connected || environmentConnected ? "is-success" : connection?.status === "action_required" ? "is-warning" : ""}`}
        >
          {connected
            ? "Connected"
            : environmentConnected
              ? "Environment"
              : connection?.status === "action_required"
                ? "Action required"
                : "Not connected"}
        </span>
      </div>

      <div className="integration-checks" aria-label="WhatsApp readiness">
        <span>Webhook {webhookConfigured ? "ready" : "missing"}</span>
        <span>Signature {signatureVerificationConfigured ? "ready" : "missing"}</span>
        <span>Signup {embeddedSignupConfigured ? "ready" : "missing"}</span>
        {connection?.historySyncRequestedAt ? (
          <span><History size={14} aria-hidden="true" /> History requested</span>
        ) : null}
      </div>

      <div className="segmented-control" aria-label="Connection type">
        <button
          type="button"
          className={mode === "coexistence" ? "is-active" : ""}
          onClick={() => setMode("coexistence")}
        >
          Existing Business App
        </button>
        <button
          type="button"
          className={mode === "standard" ? "is-active" : ""}
          onClick={() => setMode("standard")}
        >
          Cloud API number
        </button>
      </div>

      {mode === "standard" ? (
        <label className="field-block whatsapp-pin-field">
          <span className="field-label">Two-step verification PIN</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{6}"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          />
        </label>
      ) : null}

      <div className="settings-actions">
        <button
          type="button"
          className="button button-primary"
          onClick={launchSignup}
          disabled={!embeddedSignupConfigured || !sdkReady || isWorking}
        >
          {isWorking ? (
            <LoaderCircle className="spin" size={16} aria-hidden="true" />
          ) : (
            <Link2 size={16} aria-hidden="true" />
          )}
          {connected || environmentConnected ? "Reconnect" : "Connect"}
        </button>
        {connection?.status === "action_required" ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={retryConnection}
            disabled={isWorking}
          >
            <RefreshCw size={16} aria-hidden="true" /> Retry setup
          </button>
        ) : null}
      </div>

      {connection?.lastError ? (
        <p className="integration-error">{connection.lastError}</p>
      ) : null}
      {status ? <p className="helper-text" role="status">{status}</p> : null}
    </section>
  );
}
