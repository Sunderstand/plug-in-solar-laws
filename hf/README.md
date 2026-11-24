---
license: cc-by-4.0
pretty_name: US Plug-in (Balcony) Solar Laws by State
language:
  - en
tags:
  - solar
  - plug-in-solar
  - balcony-solar
  - energy
  - law
  - legislation
  - united-states
  - tabular
size_categories:
  - n<1K
task_categories:
  - table-question-answering
configs:
  - config_name: default
    data_files:
      - split: train
        path: laws.csv
---

# US Plug-in (Balcony) Solar Laws by State

<!-- description -->Plug-in (balcony) solar law status for all 50 US states, DC and 5 territories: bill, status, start date, source link and date checked, where each exists.<!-- /description --> A copy of the table at [sunderstand.com/plug-in-solar/legislation](https://sunderstand.com/plug-in-solar/legislation?utm_source=huggingface), which has each state's full rules and is the place to read and cite it.

**Informational, not legal advice; verify with the source link.**

**Last checked:** <!-- last_checked -->2026-11-23<!-- /last_checked -->. **Rows:** <!-- row_count -->56<!-- /row_count -->. There is no size-limit column. <!-- source_link_rows -->36<!-- /source_link_rows --> rows have a `source_link`.

## Columns

| Column | Meaning | Type |
|---|---|---|
| `state` | State, District of Columbia or territory name | string |
| `bill` | Bill or act number, or blank | string |
| `status` | Law status (allowed values: see the GitHub README) | string |
| `takes_effect` | Date a signed law takes effect, or blank | date YYYY-MM-DD |
| `source_link` | Government page read, or blank | URL |
| `source_page` | Sunderstand's page for the state, or blank | URL |
| `checked_on` | Date the row was last checked, or blank | date YYYY-MM-DD |

## How to cite

Sunderstand, "Plug-in and balcony solar laws by state", checked <!-- last_checked -->2026-11-23<!-- /last_checked -->, https://sunderstand.com/plug-in-solar/legislation

## License

CC BY 4.0. Credit "Sunderstand" and link to https://sunderstand.com/plug-in-solar/legislation. Source and versions: https://github.com/sunderstand/plug-in-solar-laws

## Disclaimer

Informational, not legal advice; verify with the source link.
