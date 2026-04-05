# Data 360 CLI

Small TypeScript CLI for working with Salesforce Data 360 Connect API resources.

## What it covers

Current commands:

- `data-stream list` for `GET /ssot/data-streams`
- `data-stream create` for `POST /ssot/data-streams`
- `connector list` for `GET /ssot/connectors`
- `connector metadata` for `GET /ssot/connectors/{connectorType}`
- `connection create` for `POST /ssot/connections`

The data-stream command models the core request shape:

- data stream metadata
- connector info
- DLO creation or reuse
- source fields
- field mappings and formula mappings
- refresh config
- optional advanced attributes

Data Streams ingest source data into a Data Lake Object (DLO). Those DLOs can later be mapped to Data Model Objects (DMOs), which fits the Data 360 flow you described.

## Usage

Install dependencies and build first:

```bash
npm install
npm run build
chmod +x bin/dc-cli
```

Run commands as:

```bash
./bin/dc-cli <command> <subcommand> [options]
```

Set auth:

```bash
export DATA360_INSTANCE_URL="https://your-instance.my.salesforce.com"
export DATA360_ACCESS_TOKEN="your-oauth-token"
export DATA360_API_VERSION="66.0"
export DATA360_DATASPACE="default"
```

Or log in with Salesforce SOAP login:

```bash
export DATA360_USERNAME="you@example.com"
export DATA360_PASSWORD="your-password"
export DATA360_SECURITY_TOKEN="your-security-token"
export DATA360_LOGIN_URL="https://login.salesforce.com"
```

If you are using a sandbox org, set `DATA360_LOGIN_URL="https://test.salesforce.com"`.

Create from a full JSON payload:

```bash
./bin/dc-cli data-stream create \
  --payload-file ./my-data-stream.json
```

List data streams:

```bash
./bin/dc-cli data-stream list
```

List available connector types:

```bash
./bin/dc-cli connector list
```

List connectors with the full field group:

```bash
./bin/dc-cli connector list \
  --field-group BIG
```

Get connector metadata for Snowflake:

```bash
./bin/dc-cli connector metadata \
  --connector-metadata-type SNOWFLAKE
```

Create a Snowflake connection from CLI flags:

```bash
./bin/dc-cli connection create \
  --connector-type SNOWFLAKE \
  --label my_snowflake_connection \
  --name my_snowflake_connection \
  --method Ingress \
  --credential authenticationOption=KeyPair \
  --credential user=my_snowflake_username \
  --credential-file privateKey=./my-private-key.p8 \
  --parameter hasPrivateNetworkRoute=false \
  --parameter accountUrl=https://my-account.snowflakecomputing.com \
  --parameter region=my-region \
  --parameter warehouse=my_warehouse
```

Create with SOAP username/password login instead of a bearer token:

```bash
./bin/dc-cli data-stream create \
  --username you@example.com \
  --password your-password \
  --security-token your-security-token \
  --login-url https://login.salesforce.com \
  --payload-file ./my-data-stream.json
```

Preview the request without calling Salesforce:

```bash
./bin/dc-cli data-stream create \
  --payload-file ./my-data-stream.json \
  --dry-run
```

Create from flags:

```bash
./bin/dc-cli data-stream create \
  --name orders_stream \
  --label "Orders Stream" \
  --datasource AwsS3_OrdersConnection \
  --connector-name OrdersConnection \
  --dlo-name orders_stream__dll \
  --dlo-label "Orders Stream" \
  --dlo-category Engagement \
  --event-datetime-field order_date \
  --source-field order_id:Text \
  --source-field customer_id:Text \
  --source-field order_date:DateTime \
  --source-field total_amount:Number \
  --dlo-field order_id:Text:pk \
  --dlo-field customer_id:Text \
  --dlo-field order_date:DateTime \
  --dlo-field total_amount:Number \
  --mapping order_id:order_id:Text \
  --mapping customer_id:customer_id:Text \
  --mapping order_date:order_date:DateTime \
  --mapping total_amount:total_amount:Number \
  --refresh-mode UPSERT \
  --frequency-type Hourly \
  --hour 1 \
  --advanced-attribute fileName='*' \
  --advanced-attribute fileType=CSV \
  --advanced-attribute importDirectory=orders
```

Reuse an existing DLO instead of creating a new one:

```bash
./bin/dc-cli data-stream create \
  --name orders_stream \
  --label "Orders Stream" \
  --datasource AwsS3_OrdersConnection \
  --connector-name OrdersConnection \
  --existing-dlo orders_stream__dll \
  --source-field order_id:Text \
  --mapping order_id:order_id:Text \
  --dry-run
```

Run the stream immediately after creation:

```bash
./bin/dc-cli data-stream create \
  --payload-file ./my-data-stream.json \
  --run-after-create
```

Install through Homebrew:

```bash
brew install ./Formula/dc-cli.rb
dc-cli --help
```

Prepare a release archive and SHA256 for Homebrew:

```bash
chmod +x scripts/prepare-homebrew-release.sh
./scripts/prepare-homebrew-release.sh
```

That script writes `release/dc-cli-<version>.tar.gz` and prints the `sha256` you should copy into the formula.

## Notes

- The TypeScript CLI uses only Node built-ins at runtime and requires Node 18+.
- Auth supports either `--access-token` plus `--instance-url`, or SOAP login with `--username` and `--password`. `--security-token` is optional but commonly needed for Salesforce SOAP login.
- Validation is intentionally focused on the create request shape from the spec, not every connector-specific rule.
- Connector list flags follow the Swagger shape: `fieldGroup`, `filters`, and `orderBy`.
- In the tested org, the Snowflake connector metadata key is `SNOWFLAKE`.
- Connection create uses the generic `ConnectionInputRepresentation` shape from the spec with `credentials[]` and `parameters[]`.
- `--dataspace` is sent as a query parameter and is also used as the default DLO dataspace when building a new DLO from flags.
- When building a new DLO with `--dlo-category Engagement`, pass `--event-datetime-field` because the spec requires it.
- Snowflake connection creation is a natural next step because the spec exposes `POST /ssot/connections` and connector metadata is now queryable from the CLI.
- The included Homebrew formula is in `Formula/dc-cli.rb`.
- Use `scripts/prepare-homebrew-release.sh` to generate the release tarball and SHA256 for the formula.
