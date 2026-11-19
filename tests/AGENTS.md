# Test architecture
- Sunday display-preference regressions run in GitHub Actions against the real document and route tree with mocked remote services; browser automation cannot run inside the application's scheduled HTTP worker.
- Full-document jsdom remounts replace the HTML element; explicitly run the production preference head bootstrap on the new document because jsdom does not execute it.