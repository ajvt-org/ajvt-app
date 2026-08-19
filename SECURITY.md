# Reporting a vulnerability

Do not open an issue. Issues are public, and this app holds members' phone
numbers and their payment proof screenshots.

Report it privately through GitHub, from the
[Security tab](https://github.com/ajvt-org/ajvt-app/security/advisories/new).
That opens a draft advisory only the maintainers can read.

You should get an answer within a week. If a fix is needed it ships as an
ordinary release, and the advisory is published once it is deployed.

## What is worth reporting

Anything that reaches another member's data or an admin action without the
account for it: a way past the session cookie, an admin route answering a
member, a payment proof readable without being signed in, member data in a
public response or in a log.
