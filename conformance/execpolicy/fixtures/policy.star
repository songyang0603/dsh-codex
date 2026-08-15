# Deterministic policy shared by sidecar and direct-upstream oracle tests.
prefix_rule(
    pattern = ["git"],
    decision = "allow",
    justification = "ordinary git commands are permitted",
)
prefix_rule(
    pattern = ["git", "push"],
    decision = "prompt",
    justification = "publishing changes requires approval",
)
prefix_rule(
    pattern = ["cargo", "publish"],
    decision = "prompt",
)
prefix_rule(
    pattern = ["rm"],
    decision = "forbidden",
    justification = "destructive removal is forbidden",
)

network_rule(host = "api.example.com", protocol = "https", decision = "allow")
network_rule(host = "flip.example.com", protocol = "https", decision = "allow")
network_rule(host = "blocked.example.com", protocol = "https", decision = "forbidden")
network_rule(host = "flip.example.com", protocol = "https", decision = "forbidden")
network_rule(host = "prompt.example.com", protocol = "https", decision = "prompt")
