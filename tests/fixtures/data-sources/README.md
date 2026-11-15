# Synthetic import fixtures

All CSV files in this directory are invented test data. They are not measurements or historical activity records.

- `arrivals-minutes.csv`: relative arrival times in minutes, with example `ticket` and `visit` attributes.
- `services-seconds.csv`: service durations in seconds, including valid zero and repeated samples.
- `invalid-arrivals.csv`: repeated ID, negative time and unknown attribute value for error-location checks.

The application's arrival template is generated from the current Scenario attributes and allowed values; these example columns are not a universal template.
