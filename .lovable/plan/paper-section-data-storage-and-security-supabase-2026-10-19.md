# Paper section: Data Storage and Security (Supabase)

Write a ready-to-paste section for the capstone paper and save it as a Word document in Files. No app changes.

## Contents
1. **Storage platform** — VA Navigator uses Lovable Cloud, a managed service built on Supabase (PostgreSQL database, authentication, server functions).
2. **What is stored and where** — table: login credentials (auth system, passwords hashed with bcrypt), saved preferences, private search history, admin roles, data sources, AI settings, audit log.
3. **How it is secured**
   - Row-level security: each user can read only their own history and preferences; admins can't read them either.
   - Roles kept in a separate protected table; the first admin is claimed once, and every later grant or removal is logged.
   - Audit log is written only by database triggers, so no one can edit it by hand.
   - Encryption in transit (HTTPS/TLS) and at rest.
   - API keys are kept as server-only secrets and never sent to the browser.
   - Privacy controls: private search, clear all history, delete account.
4. **Compliance wording** — "designed with HIPAA and NIST principles in mind" (no claim of certification).
5. **Why Supabase** — open source, standard PostgreSQL, built-in authentication and row-level security, and managed hosting through Lovable Cloud.
6. **References** — Supabase docs (RLS, Auth), PostgreSQL docs, NIST SP 800-63B, HHS HIPAA Security Rule, in APA style.

## Deliverable
- `/mnt/documents/VA_Navigator_Data_Storage_Security.docx`, about 1.5–2 pages, academic tone, with one table.
