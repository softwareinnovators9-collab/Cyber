"""
CyberShield Threat Metrics (Simple Version)

Goal: Reduce device compromise risk

Metrics:
M1 - Alerts detected per day per device
M2 - False positive rate (% per week)
"""

from collections import defaultdict
from datetime import datetime

# ================= SAMPLE DATA =================
# Each log represents a detection event
# true_positive = real threat
# false_positive = incorrect alert

logs = [
    {"device_id": "D1", "timestamp": "2026-05-01 10:00:00", "type": "true_positive"},
    {"device_id": "D1", "timestamp": "2026-05-01 11:00:00", "type": "false_positive"},
    {"device_id": "D2", "timestamp": "2026-05-01 12:00:00", "type": "true_positive"},
    {"device_id": "D1", "timestamp": "2026-05-02 09:00:00", "type": "true_positive"},
    {"device_id": "D2", "timestamp": "2026-05-02 14:00:00", "type": "false_positive"},
]

# ================= M1: Alerts per Day per Device =================
def calculate_alerts_per_day(logs):
    alerts_per_day = defaultdict(lambda: defaultdict(int))

    for log in logs:
        device = log["device_id"]
        date = log["timestamp"].split(" ")[0]

        alerts_per_day[device][date] += 1

    return alerts_per_day


# ================= M2: False Positive Rate =================
def calculate_false_positive_rate(logs):
    total_alerts = len(logs)
    false_positives = sum(1 for log in logs if log["type"] == "false_positive")

    if total_alerts == 0:
        return 0

    rate = (false_positives / total_alerts) * 100
    return rate


# ================= RUN METRICS =================
alerts = calculate_alerts_per_day(logs)
false_positive_rate = calculate_false_positive_rate(logs)

# ================= OUTPUT =================
print("=== M1: Alerts Detected per Day per Device ===")
for device, days in alerts.items():
    print(f"\nDevice {device}:")
    for day, count in days.items():
        print(f"  {day}: {count} alerts")

print("\n=== M2: False Positive Rate ===")
print(f"{false_positive_rate:.2f}%")

