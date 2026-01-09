RATE_LIMITS = {
    "developer": {
        "read": 100,
        "write": 20,
    },
    "manager": {
        "read": 200,
        "write": 50,
    },
    "auditor": {
        "read": None, #infinite
        "write": 0,
    },
}

WINDOW_SECONDS = 3600
