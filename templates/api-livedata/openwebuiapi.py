"""
title: winSIM Product Feed
author: Service-mit-Herz
description: Query the winSIM mobile tariff product feed (XML) for tariffs, prices and data volumes.
version: 0.1.0
"""

import os
import re
import time
import xml.etree.ElementTree as ET
from typing import Optional

from pydantic import BaseModel, Field


class Tools:
    class Valves(BaseModel):
        FEED_PATH: str = Field(
            default="/home/www/20260709/ai-plattform2/data/product_feed_winsim_all.xml",
            description="Absolute path to the winSIM product feed XML file on disk.",
        )
        CACHE_TTL_SECONDS: int = Field(
            default=300,
            description="How long the parsed feed is cached before being re-read from disk.",
        )

    def __init__(self):
        self.valves = self.Valves()
        self._cache: list[dict] = []
        self._cache_time: float = 0.0

    # --- internal helpers -------------------------------------------------

    def _get_products(self, force_reload: bool = False) -> list[dict]:
        now = time.time()
        if (
            not force_reload
            and self._cache
            and (now - self._cache_time) < self.valves.CACHE_TTL_SECONDS
        ):
            return self._cache

        if not os.path.isfile(self.valves.FEED_PATH):
            raise FileNotFoundError(
                f"Product-Feed nicht gefunden unter '{self.valves.FEED_PATH}'."
            )

        with open(self.valves.FEED_PATH, "r", encoding="utf-8") as f:
            xml_text = f.read()

        # The feed is occasionally truncated (e.g. cut off after the last
        # <product>) and missing its closing root tag. Auto-close it so a
        # truncated download doesn't hard-fail the whole tool.
        stripped = xml_text.rstrip()
        if stripped and not stripped.endswith("</products>"):
            xml_text = stripped + "</products>"

        root = ET.fromstring(xml_text)

        products = []
        for node in root.findall("product"):
            item = {child.tag: (child.text or "").strip() for child in node}
            products.append(item)

        self._cache = products
        self._cache_time = now
        return products

    @staticmethod
    def _parse_price(value: str) -> Optional[float]:
        if not value:
            return None
        try:
            return float(value.replace(".", "").replace(",", "."))
        except ValueError:
            return None

    @staticmethod
    def _parse_data_volume_gb(value: str) -> Optional[float]:
        if not value:
            return None
        if "flat" in value.lower() or "unlimited" in value.lower():
            return float("inf")
        match = re.search(r"([\d.,]+)\s*(GB|MB|TB)", value, re.IGNORECASE)
        if not match:
            return None
        number = float(match.group(1).replace(",", "."))
        unit = match.group(2).upper()
        if unit == "MB":
            return number / 1024
        if unit == "TB":
            return number * 1024
        return number

    @staticmethod
    def _format_product(p: dict) -> str:
        return "\n".join(
            [
                f"- {p.get('productName', '?')} (ID {p.get('productId', '?')})",
                f"  Tarif: {p.get('tariffName', '')}",
                f"  Netz: {p.get('network', '')} | Marke: {p.get('brand', '')}",
                f"  Vertragslaufzeit: {p.get('contractDurationText', '')}",
                f"  Grundpreis: {p.get('priceMonth', '')} {p.get('currency', '')}/Monat",
                f"  Einmalpreis: {p.get('price', '')} {p.get('currency', '')}",
                f"  Datenvolumen: {p.get('includedDataVolume', '')}",
                f"  Minuten: {p.get('includedMinutes', '')} | SMS: {p.get('includedSMS', '')}",
                f"  Link: {p.get('deepLink', '')}",
            ]
        )

    # --- tools exposed to the LLM ------------------------------------------

    def list_all_tariffs(self) -> str:
        """
        List all winSIM mobile tariffs currently available in the product feed, including
        price, data volume and contract duration for each.
        """
        try:
            products = self._get_products()
        except FileNotFoundError as e:
            return str(e)

        if not products:
            return "Keine Tarife im Produkt-Feed gefunden."
        return "\n\n".join(self._format_product(p) for p in products)

    def get_tariff_by_id(
        self,
        product_id: str = Field(
            ..., description="The productId of the winSIM tariff to look up."
        ),
    ) -> str:
        """
        Get full details for a single winSIM tariff by its productId.
        """
        try:
            products = self._get_products()
        except FileNotFoundError as e:
            return str(e)

        for p in products:
            if p.get("productId") == str(product_id):
                return self._format_product(p)
        return f"Kein Tarif mit productId '{product_id}' gefunden."

    def search_tariffs(
        self,
        max_price_month: Optional[float] = Field(
            None, description="Maximum monthly price in EUR."
        ),
        min_data_gb: Optional[float] = Field(
            None, description="Minimum included data volume in GB."
        ),
        contract_duration_months: Optional[int] = Field(
            None,
            description="Exact contract duration in months to filter by, e.g. 1, 12 or 24.",
        ),
        network: Optional[str] = Field(
            None,
            description="Mobile network operator to filter by, e.g. 'Drillisch'.",
        ),
    ) -> str:
        """
        Search winSIM tariffs by maximum monthly price, minimum data volume, contract
        duration and/or network operator.
        """
        try:
            products = self._get_products()
        except FileNotFoundError as e:
            return str(e)

        results = []
        for p in products:
            if max_price_month is not None:
                price_month = self._parse_price(p.get("priceMonth", ""))
                if price_month is None or price_month > max_price_month:
                    continue
            if min_data_gb is not None:
                data_gb = self._parse_data_volume_gb(p.get("includedDataVolume", ""))
                if data_gb is None or data_gb < min_data_gb:
                    continue
            if contract_duration_months is not None:
                try:
                    if int(p.get("contractDuration", -1)) != contract_duration_months:
                        continue
                except ValueError:
                    continue
            if network is not None and network.lower() not in p.get(
                "network", ""
            ).lower():
                continue
            results.append(p)

        if not results:
            return "Keine passenden Tarife gefunden."
        return "\n\n".join(self._format_product(p) for p in results)

    def get_cheapest_tariffs(
        self,
        count: int = Field(3, description="Number of cheapest tariffs to return."),
    ) -> str:
        """
        Get the N cheapest winSIM tariffs, sorted ascending by monthly price.
        """
        try:
            products = self._get_products()
        except FileNotFoundError as e:
            return str(e)

        priced = [
            (self._parse_price(p.get("priceMonth", "")), p) for p in products
        ]
        priced = [(price, p) for price, p in priced if price is not None]
        priced.sort(key=lambda x: x[0])

        top = priced[: max(count, 0)]
        if not top:
            return "Keine Tarife mit Preisangabe gefunden."
        return "\n\n".join(self._format_product(p) for _, p in top)

    def reload_feed(self) -> str:
        """
        Force-reload the winSIM product feed from disk, bypassing the cache.
        """
        try:
            products = self._get_products(force_reload=True)
        except FileNotFoundError as e:
            return str(e)
        return f"Feed neu geladen: {len(products)} Tarife gefunden."
