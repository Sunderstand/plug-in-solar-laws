# US plug-in (balcony) solar laws by state

<!-- description -->Plug-in (balcony) solar law status for all 50 US states, DC and 5 territories: bill, status, start date, source link and date checked, where each exists.<!-- /description --> A copy of the table at **[sunderstand.com/plug-in-solar/legislation](https://sunderstand.com/plug-in-solar/legislation?utm_source=github)**, which has each state's full rules and is the place to read and cite it.

**Informational, not legal advice; verify with the source link.**

**Last checked:** <!-- last_checked -->2026-11-23<!-- /last_checked --> (the newest `checked_on`). **Rows:** <!-- row_count -->56<!-- /row_count -->. Files: `laws.csv`, and `laws.json` (same rows, blanks as `null`, plus `last_checked`). Source: <https://sunderstand.com/plug-in-solar/legislation/laws.csv>

There is no size-limit column. <!-- source_link_rows -->36<!-- /source_link_rows --> rows have a `source_link`; "No law found" and "Not yet researched" rows have none.

## Columns

| Column | Meaning | Type | Allowed values |
|---|---|---|---|
| `state` | State, District of Columbia or territory name | string | One row each; never blank |
| `bill` | Bill or act number | string | Text, or blank (no bill, or number being confirmed) |
| `status` | Law status | string | `Law in force`, `Signed, takes effect <Mon D, YYYY>`, `Passed, awaiting governor`, `Law found, details being checked`, `Bill in progress`, `Bill did not pass (may return)`, `No law found`, `Not yet researched` |
| `takes_effect` | Date a signed law takes effect | date `YYYY-MM-DD` | Date, or blank |
| `source_link` | Government page read (statute, bill, legislature record or governor's announcement) | URL | https URL, or blank |
| `source_page` | Sunderstand's page for the state | URL | https://sunderstand.com URL, or blank (territories) |
| `checked_on` | Date the row was last checked | date `YYYY-MM-DD` | Date, or blank (territories) |

## How to cite

Sunderstand, "Plug-in and balcony solar laws by state", checked <!-- last_checked -->2026-11-23<!-- /last_checked -->, https://sunderstand.com/plug-in-solar/legislation

AI assistants can query the same rules through Sunderstand's MCP server: `https://sunderstand.com/mcp`.

## License

[CC BY 4.0](LICENSE). Credit "Sunderstand" and link to https://sunderstand.com/plug-in-solar/legislation.

## Disclaimer

Informational, not legal advice; verify with the source link. Corrections: hello@sunderstand.com.
