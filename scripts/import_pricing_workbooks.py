#!/usr/bin/env python3
"""Import the client-owned pricing workbooks into Supabase without third-party XLSX packages."""

import json
import os
import re
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env():
    for raw in (ROOT / ".env.local").read_text().splitlines():
        raw = raw.strip()
        if raw and not raw.startswith("#") and "=" in raw:
            key, value = raw.split("=", 1)
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def read_rows(path):
    with zipfile.ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = ["".join(node.text or "" for node in item.iter() if node.tag.endswith("}t")) for item in root]
        root = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        output = []
        for row in (node for node in root.iter() if node.tag.endswith("}row")):
            values = {}
            for cell in (node for node in row if node.tag.endswith("}c")):
                match = re.match(r"[A-Z]+", cell.attrib.get("r", ""))
                if not match:
                    continue
                value = next((node.text for node in cell.iter() if node.tag.endswith("}v") or node.tag.endswith("}t")), None)
                if cell.attrib.get("t") == "s" and value is not None:
                    value = shared[int(value)]
                values[match.group()] = value
            if values:
                output.append((int(row.attrib["r"]), values))
        return output


def amount(value):
    if value is None:
        return None
    match = re.search(r"-?[0-9][0-9,]*(?:\.[0-9]+)?", str(value).replace("\xa0", " "))
    return float(match.group().replace(",", "")) if match else None


def request(method, path, payload=None, prefer=None):
    base = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/") + "/rest/v1/" + path
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    headers = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(payload).encode() if payload is not None else None
    with urllib.request.urlopen(urllib.request.Request(base, data=data, headers=headers, method=method)) as response:
        body = response.read()
        return json.loads(body) if body else None


def main():
    load_env()
    os.environ.setdefault("SSL_CERT_FILE", "/etc/ssl/cert.pem")
    catalogs = request("GET", "pricing_catalogs?select=id,code")
    ids = {row["code"]: row["id"] for row in catalogs}
    specs = [
        ("eps_recommended_pricing_2025_2026", ROOT / "public/EPS_Recommended_Pricing_2025_2026.xlsx", "handover_cleaning"),
        ("handyman_recommended_pricing_2025_2026", ROOT / "public/Handyman_Recommended_Pricing_2025_2026.xlsx", None),
    ]
    all_items = []
    for code, path, default_category in specs:
        catalog_id = ids[code]
        for row_number, row in read_rows(path)[1:]:
            recommended = amount(row.get("E"))
            title = (row.get("A") or "").strip()
            if not title or not recommended or recommended <= 0:
                continue
            all_items.append({
                "catalog_id": catalog_id,
                "service_title": title,
                "category": default_category or row.get("B"),
                "description": "Imported from client pricing workbook" if default_category else row.get("C"),
                "legacy_price": amount(row.get("D")) if not default_category else None,
                "furnished_surcharge": amount(row.get("B")) if default_category else None,
                "base_unfurnished_price": amount(row.get("C")) if default_category else None,
                "legacy_total_price": amount(row.get("D")) if default_category else None,
                "recommended_price": recommended,
                "source_row_number": row_number,
                "sort_order": row_number,
                "is_active": True,
            })
    for catalog_id in ids.values():
        request("DELETE", f"pricing_items?catalog_id=eq.{catalog_id}")
    for start in range(0, len(all_items), 100):
        request("POST", "pricing_items", all_items[start:start + 100], "return=minimal")
    print(f"Imported {len(all_items)} pricing rows from 2 client workbooks.")


if __name__ == "__main__":
    main()
