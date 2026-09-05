package com.marketplace.model;

import java.util.LinkedHashMap;
import java.util.Map;

public class RateCardItem {
    public String deliverable; // e.g. "1 Reel", "1 Story", "Video + 3 Stories bundle"
    public double price;

    public RateCardItem(String deliverable, double price) {
        this.deliverable = deliverable;
        this.price = price;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("deliverable", deliverable);
        m.put("price", price);
        return m;
    }
}
