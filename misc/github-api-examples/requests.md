# Requests

Examples of requests to the github API and their output:

| What? | Request CURL | Output File |
|-------|--------------|-------------|
| Get all commits for a repo | curl -i https://api.github.com/repos/amilner42/code-tidbit/commits | [list-commits-response-1.json](/misc/github-api-examples/list-commits-response-1.json) |
| Get the difs and other info for a commit | curl -i https://api.github.com/repos/amilner42/kleen/commits/63072d0a9649f36ca4a8acde26bffbeac6489776 | [commit-dif-example-response-1.json](/misc/github-api-examples/commit-dif-example-response-1.json) |
