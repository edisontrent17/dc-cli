#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

const DEFAULT_API_VERSION = "66.0";
const DEFAULT_DATASTREAM_TYPE = "CONNECTORSFRAMEWORK";
const DEFAULT_CONNECTOR_TYPE = "DataConnector";
const DEFAULT_DLO_CATEGORY = "Profile";
const DEFAULT_REFRESH_MODE = "UPSERT";
const DEFAULT_FREQUENCY_TYPE = "None";
const SOAP_LOGIN_FALLBACK_VERSIONS = ["64.0", "63.0", "62.0", "61.0"];

class CliError extends Error {}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type Options = {
  command?: string;
  subcommand?: string;
  instanceUrl?: string;
  accessToken?: string;
  username?: string;
  password?: string;
  securityToken?: string;
  loginUrl?: string;
  apiVersion: string;
  dataspace?: string;
  dryRun: boolean;
  json: boolean;
  runAfterCreate: boolean;
  payloadFile?: string;
  filters?: string;
  orderBy?: string;
  fieldGroup?: string;
  connectorMetadataType?: string;
  connectionId?: string;
  method?: string;
  credential: string[];
  credentialFile: string[];
  parameter: string[];
  name?: string;
  label?: string;
  datastreamType: string;
  datasource?: string;
  connectorType: string;
  connectorName?: string;
  connectorDetail: string[];
  existingDlo?: string;
  dloName?: string;
  dloLabel?: string;
  dloCategory: string;
  eventDatetimeField?: string;
  recordModifiedField?: string;
  orgUnitIdentifierField?: string;
  dloField: string[];
  sourceField: string[];
  mapping: string[];
  formula: string[];
  advancedAttribute: string[];
  refreshMode: string;
  frequencyType: string;
  hour: number[];
  dayOfWeek?: string;
  dayOfMonth: number[];
  accelerationEnabled: boolean;
};

type DataStreamPayload = {
  name: string;
  label: string;
  datasource?: string;
  datastreamType?: string;
  connectorInfo: {
    connectorType: string;
    connectorDetails: JsonObject;
  };
  dataLakeObjectInfo?: JsonObject;
  existingDataLakeObjectInfo?: JsonObject;
  sourceFields: JsonObject[];
  mappings: JsonObject[];
  refreshConfig: JsonObject;
  advancedAttributes?: JsonObject;
  currencyIsoCodeInfo?: JsonObject;
  dataAccessMode?: string;
};

type ConnectionPayload = {
  connectorType: string;
  label: string;
  name?: string;
  method: string;
  credentials: JsonObject[];
  parameters: JsonObject[];
};

function main(argv: string[]): Promise<number> {
  return run(argv).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`error: ${message}`);
    return 2;
  });
}

async function run(argv: string[]): Promise<number> {
  const options = parseArgs(argv);

  if (!options.command) {
    printRootHelp();
    return 1;
  }

  switch (options.command) {
    case "data-stream":
      return runDataStreamCommand(options);
    case "connector":
      return runConnectorCommand(options);
    case "connection":
      return runConnectionCommand(options);
    default:
      throw new CliError(`Unknown command: ${options.command}`);
  }
}

function parseArgs(argv: string[]): Options {
  const defaults: Options = {
    instanceUrl: process.env.DATA360_INSTANCE_URL,
    accessToken: process.env.DATA360_ACCESS_TOKEN,
    username: process.env.DATA360_USERNAME,
    password: process.env.DATA360_PASSWORD,
    securityToken: process.env.DATA360_SECURITY_TOKEN,
    loginUrl: process.env.DATA360_LOGIN_URL,
    apiVersion: process.env.DATA360_API_VERSION ?? DEFAULT_API_VERSION,
    dataspace: process.env.DATA360_DATASPACE,
    dryRun: false,
    json: true,
    runAfterCreate: false,
    credential: [],
    credentialFile: [],
    parameter: [],
    datastreamType: DEFAULT_DATASTREAM_TYPE,
    connectorType: DEFAULT_CONNECTOR_TYPE,
    connectorDetail: [],
    dloCategory: DEFAULT_DLO_CATEGORY,
    dloField: [],
    sourceField: [],
    mapping: [],
    formula: [],
    advancedAttribute: [],
    refreshMode: DEFAULT_REFRESH_MODE,
    frequencyType: DEFAULT_FREQUENCY_TYPE,
    hour: [],
    dayOfMonth: [],
    accelerationEnabled: false
  };

  let index = 0;
  if (argv[index] && !argv[index].startsWith("-")) {
    defaults.command = argv[index++];
  }
  if (argv[index] && !argv[index].startsWith("-")) {
    defaults.subcommand = argv[index++];
  }

  while (index < argv.length) {
    const token = argv[index++];
    if (token === "--help" || token === "-h") {
      printHelp(defaults.command, defaults.subcommand);
      process.exit(0);
    }

    if (!token.startsWith("--")) {
      throw new CliError(`Unexpected argument: ${token}`);
    }

    const name = token.slice(2);
    switch (name) {
      case "instance-url":
        defaults.instanceUrl = readValue(argv, index++, token);
        break;
      case "access-token":
        defaults.accessToken = readValue(argv, index++, token);
        break;
      case "username":
        defaults.username = readValue(argv, index++, token);
        break;
      case "password":
        defaults.password = readValue(argv, index++, token);
        break;
      case "security-token":
        defaults.securityToken = readValue(argv, index++, token);
        break;
      case "login-url":
        defaults.loginUrl = readValue(argv, index++, token);
        break;
      case "api-version":
        defaults.apiVersion = readValue(argv, index++, token);
        break;
      case "dataspace":
        defaults.dataspace = readValue(argv, index++, token);
        break;
      case "dry-run":
        defaults.dryRun = true;
        break;
      case "json":
        defaults.json = true;
        break;
      case "run-after-create":
        defaults.runAfterCreate = true;
        break;
      case "filters":
        defaults.filters = readValue(argv, index++, token);
        break;
      case "order-by":
        defaults.orderBy = readValue(argv, index++, token);
        break;
      case "field-group":
        defaults.fieldGroup = readValue(argv, index++, token);
        break;
      case "connector-metadata-type":
        defaults.connectorMetadataType = readValue(argv, index++, token);
        break;
      case "connection-id":
        defaults.connectionId = readValue(argv, index++, token);
        break;
      case "method":
        defaults.method = readValue(argv, index++, token);
        break;
      case "credential":
        defaults.credential.push(readValue(argv, index++, token));
        break;
      case "credential-file":
        defaults.credentialFile.push(readValue(argv, index++, token));
        break;
      case "parameter":
        defaults.parameter.push(readValue(argv, index++, token));
        break;
      case "payload-file":
        defaults.payloadFile = readValue(argv, index++, token);
        break;
      case "name":
        defaults.name = readValue(argv, index++, token);
        break;
      case "label":
        defaults.label = readValue(argv, index++, token);
        break;
      case "datastream-type":
        defaults.datastreamType = readValue(argv, index++, token);
        break;
      case "datasource":
        defaults.datasource = readValue(argv, index++, token);
        break;
      case "connector-type":
        defaults.connectorType = readValue(argv, index++, token);
        break;
      case "connector-name":
        defaults.connectorName = readValue(argv, index++, token);
        break;
      case "connector-detail":
        defaults.connectorDetail.push(readValue(argv, index++, token));
        break;
      case "existing-dlo":
        defaults.existingDlo = readValue(argv, index++, token);
        break;
      case "dlo-name":
        defaults.dloName = readValue(argv, index++, token);
        break;
      case "dlo-label":
        defaults.dloLabel = readValue(argv, index++, token);
        break;
      case "dlo-category":
        defaults.dloCategory = readValue(argv, index++, token);
        break;
      case "event-datetime-field":
        defaults.eventDatetimeField = readValue(argv, index++, token);
        break;
      case "record-modified-field":
        defaults.recordModifiedField = readValue(argv, index++, token);
        break;
      case "org-unit-identifier-field":
        defaults.orgUnitIdentifierField = readValue(argv, index++, token);
        break;
      case "dlo-field":
        defaults.dloField.push(readValue(argv, index++, token));
        break;
      case "source-field":
        defaults.sourceField.push(readValue(argv, index++, token));
        break;
      case "mapping":
        defaults.mapping.push(readValue(argv, index++, token));
        break;
      case "formula":
        defaults.formula.push(readValue(argv, index++, token));
        break;
      case "advanced-attribute":
        defaults.advancedAttribute.push(readValue(argv, index++, token));
        break;
      case "refresh-mode":
        defaults.refreshMode = readValue(argv, index++, token);
        break;
      case "frequency-type":
        defaults.frequencyType = readValue(argv, index++, token);
        break;
      case "hour":
        defaults.hour.push(Number.parseInt(readValue(argv, index++, token), 10));
        break;
      case "day-of-week":
        defaults.dayOfWeek = readValue(argv, index++, token);
        break;
      case "day-of-month":
        defaults.dayOfMonth.push(Number.parseInt(readValue(argv, index++, token), 10));
        break;
      case "acceleration-enabled":
        defaults.accelerationEnabled = true;
        break;
      default:
        throw new CliError(`Unknown option: ${token}`);
    }
  }

  return defaults;
}

async function runDataStreamCommand(options: Options): Promise<number> {
  if (!options.subcommand) {
    printDataStreamHelp();
    return 1;
  }

  if (options.subcommand !== "create") {
    throw new CliError(`Unknown data-stream command: ${options.subcommand}`);
  }

  const payload = await loadPayload(options);

  if (options.dryRun) {
    printJson(payload);
    return 0;
  }

  const auth = await resolveAuth(options);
  const response = await requestJson({
    method: "POST",
    instanceUrl: auth.instanceUrl,
    accessToken: auth.accessToken,
    apiVersion: options.apiVersion,
    dataspace: options.dataspace,
    path: "/ssot/data-streams",
    payload
  });

  printJson(response);

  if (options.runAfterCreate) {
    const recordId = getObjectValue(response, "recordId");
    if (typeof recordId !== "string" || recordId.length === 0) {
      throw new CliError("Create succeeded but no recordId was returned, so the run action cannot be invoked.");
    }

    const runResponse = await requestJson({
      method: "POST",
      instanceUrl: auth.instanceUrl,
      accessToken: auth.accessToken,
      apiVersion: options.apiVersion,
      dataspace: options.dataspace,
      path: `/ssot/data-streams/${recordId}/actions/run`,
      payload: {}
    });
    printJson(runResponse);
  }

  return 0;
}

async function runConnectorCommand(options: Options): Promise<number> {
  if (!options.subcommand) {
    printConnectorHelp();
    return 1;
  }

  const auth = await resolveAuth(options);

  switch (options.subcommand) {
    case "list": {
      const response = await requestJson({
        method: "GET",
        instanceUrl: auth.instanceUrl,
        accessToken: auth.accessToken,
        apiVersion: options.apiVersion,
        dataspace: options.dataspace,
        path: "/ssot/connectors",
        query: buildConnectorListQuery(options)
      });
      printJson(response);
      return 0;
    }
    case "metadata": {
      const connectorType = options.connectorMetadataType ?? options.connectorType;
      if (!connectorType) {
        throw new CliError("Missing connector type. Use --connector-metadata-type or --connector-type.");
      }
      const response = await requestJson({
        method: "GET",
        instanceUrl: auth.instanceUrl,
        accessToken: auth.accessToken,
        apiVersion: options.apiVersion,
        dataspace: options.dataspace,
        path: `/ssot/connectors/${encodeURIComponent(connectorType)}`,
        query: {}
      });
      printJson(response);
      return 0;
    }
    default:
      throw new CliError(`Unknown connector command: ${options.subcommand}`);
  }
}

async function runConnectionCommand(options: Options): Promise<number> {
  if (!options.subcommand) {
    printConnectionHelp();
    return 1;
  }

  const auth = await resolveAuth(options);

  switch (options.subcommand) {
    case "create": {
      const payload = await loadConnectionPayload(options);

      if (options.dryRun) {
        printJson(payload);
        return 0;
      }

      const response = await requestJson({
        method: "POST",
        instanceUrl: auth.instanceUrl,
        accessToken: auth.accessToken,
        apiVersion: options.apiVersion,
        dataspace: options.dataspace,
        path: "/ssot/connections",
        payload
      });

      printJson(response);
      return 0;
    }
    case "databases": {
      if (!options.connectionId) {
        throw new CliError("Missing connection ID. Use --connection-id.");
      }

      const response = await requestJson({
        method: "POST",
        instanceUrl: auth.instanceUrl,
        accessToken: auth.accessToken,
        apiVersion: options.apiVersion,
        dataspace: options.dataspace,
        path: `/ssot/connections/${encodeURIComponent(options.connectionId)}/databases`,
        payload: {}
      });

      printJson(response);
      return 0;
    }
    default:
      throw new CliError(`Unknown connection command: ${options.subcommand}`);
  }
}

async function resolveAuth(options: Options): Promise<{ instanceUrl: string; accessToken: string }> {
  const accessToken = options.accessToken;
  const instanceUrl = options.instanceUrl;
  if (accessToken) {
    if (!instanceUrl) {
      throw new CliError("Missing instance URL. Set --instance-url or DATA360_INSTANCE_URL when using an access token.");
    }
    return { instanceUrl, accessToken };
  }

  if (!options.username || !options.password) {
    throw new CliError(
      "Missing auth. Use --access-token with --instance-url, or use --username and --password for SOAP login."
    );
  }

  return soapLogin({
    username: options.username,
    password: options.password,
    securityToken: options.securityToken,
    loginUrl: options.loginUrl ?? "https://login.salesforce.com",
    apiVersion: options.apiVersion
  });
}

function readValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new CliError(`Missing value for ${flag}`);
  }
  return value;
}

async function loadPayload(options: Options): Promise<DataStreamPayload> {
  if (options.payloadFile) {
    const contents = await readFile(options.payloadFile, "utf8");
    const payload = JSON.parse(contents) as DataStreamPayload;
    validatePayload(payload);
    return payload;
  }

  return buildPayloadFromFlags(options);
}

async function loadConnectionPayload(options: Options): Promise<ConnectionPayload> {
  if (options.payloadFile) {
    const contents = await readFile(options.payloadFile, "utf8");
    const payload = JSON.parse(contents) as ConnectionPayload;
    validateConnectionPayload(payload);
    return payload;
  }

  const payload = await buildConnectionPayloadFromFlags(options);
  validateConnectionPayload(payload);
  return payload;
}

function buildPayloadFromFlags(options: Options): DataStreamPayload {
  const required: Array<[string, string | undefined]> = [
    ["--name", options.name],
    ["--label", options.label],
    ["--datasource", options.datasource],
    ["--connector-name", options.connectorName]
  ];
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new CliError(`Missing required flags for builder mode: ${missing.join(", ")}`);
  }

  const sourceFields = options.sourceField.map(parseSourceField);
  const mappings = [...options.mapping.map(parseMapping), ...options.formula.map(parseFormula)];

  if (sourceFields.length === 0) {
    throw new CliError("At least one --source-field is required in builder mode.");
  }
  if (mappings.length === 0) {
    throw new CliError("At least one --mapping or --formula is required in builder mode.");
  }

  const payload: DataStreamPayload = {
    name: options.name!,
    label: options.label!,
    datasource: options.datasource,
    datastreamType: options.datastreamType,
    connectorInfo: {
      connectorType: options.connectorType,
      connectorDetails: {
        name: options.connectorName!,
        ...parseKeyValueList(options.connectorDetail)
      }
    },
    sourceFields,
    mappings,
    refreshConfig: buildRefreshConfig(options)
  };

  const advancedAttributes = parseKeyValueList(options.advancedAttribute);
  if (Object.keys(advancedAttributes).length > 0) {
    payload.advancedAttributes = advancedAttributes;
  }

  if (options.existingDlo) {
    payload.existingDataLakeObjectInfo = { name: options.existingDlo };
  } else {
    if (!options.dloName || !options.dloLabel) {
      throw new CliError("Provide --existing-dlo or both --dlo-name and --dlo-label.");
    }

    const dloFields = options.dloField.map(parseDloField);
    if (dloFields.length === 0) {
      throw new CliError("At least one --dlo-field is required when creating a new DLO.");
    }
    if (!dloFields.some((field) => field.isPrimaryKey === true)) {
      throw new CliError("At least one --dlo-field must be marked as the primary key with :pk.");
    }

    const dloInfo: JsonObject = {
      name: options.dloName,
      label: options.dloLabel,
      category: options.dloCategory,
      dataspaceInfo: [{ name: options.dataspace ?? "default" }],
      dataLakeFieldInputRepresentations: dloFields
    };

    if (options.dloCategory === "Engagement") {
      if (!options.eventDatetimeField) {
        throw new CliError("--event-datetime-field is required when --dlo-category is Engagement.");
      }
      dloInfo.eventDateTimeFieldName = options.eventDatetimeField;
    }
    if (options.recordModifiedField) {
      dloInfo.recordModifiedFieldName = options.recordModifiedField;
    }
    if (options.orgUnitIdentifierField) {
      dloInfo.orgUnitIdentifierFieldName = options.orgUnitIdentifierField;
    }

    payload.dataLakeObjectInfo = dloInfo;
  }

  validatePayload(payload);
  return payload;
}

async function buildConnectionPayloadFromFlags(options: Options): Promise<ConnectionPayload> {
  const required: Array<[string, string | undefined]> = [
    ["--connector-type", options.connectorType],
    ["--label", options.label],
    ["--method", options.method]
  ];
  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new CliError(`Missing required flags for connection builder mode: ${missing.join(", ")}`);
  }

  const credentials = [
    ...options.credential.map(parseConnectionParameter),
    ...(await Promise.all(options.credentialFile.map(parseConnectionParameterFile)))
  ];
  const parameters = options.parameter.map(parseConnectionParameter);

  if (credentials.length === 0) {
    throw new CliError("At least one --credential or --credential-file is required in connection builder mode.");
  }
  if (parameters.length === 0) {
    throw new CliError("At least one --parameter is required in connection builder mode.");
  }

  return {
    connectorType: options.connectorType,
    label: options.label!,
    name: options.name,
    method: options.method!,
    credentials,
    parameters
  };
}

function buildRefreshConfig(options: Options): JsonObject {
  const frequency: JsonObject = {
    frequencyType: options.frequencyType
  };
  if (options.hour.length > 0) {
    frequency.hours = options.hour;
  }
  if (options.dayOfWeek) {
    frequency.refreshDayOfWeek = options.dayOfWeek;
  }
  if (options.dayOfMonth.length > 0) {
    frequency.refreshDayOfMonth = options.dayOfMonth;
  }

  const refreshConfig: JsonObject = {
    refreshMode: options.refreshMode,
    frequency
  };
  if (options.accelerationEnabled) {
    refreshConfig.isAccelerationEnabled = true;
  }
  return refreshConfig;
}

function parseConnectionParameter(value: string): JsonObject {
  const separator = value.indexOf("=");
  if (separator < 1) {
    throw new CliError(`Expected NAME=VALUE, got: ${value}`);
  }
  return {
    paramName: value.slice(0, separator),
    value: value.slice(separator + 1)
  };
}

async function parseConnectionParameterFile(value: string): Promise<JsonObject> {
  const separator = value.indexOf("=");
  if (separator < 1) {
    throw new CliError(`Expected NAME=PATH, got: ${value}`);
  }

  const paramName = value.slice(0, separator);
  const filePath = value.slice(separator + 1);
  const fileContents = (await readFile(filePath, "utf8")).trim();

  return {
    paramName,
    value: fileContents
  };
}

function parseKeyValueList(items: string[]): JsonObject {
  const parsed: JsonObject = {};
  for (const item of items) {
    const separator = item.indexOf("=");
    if (separator < 1) {
      throw new CliError(`Expected KEY=VALUE, got: ${item}`);
    }
    const key = item.slice(0, separator);
    const value = item.slice(separator + 1);
    parsed[key] = value;
  }
  return parsed;
}

function parseSourceField(value: string): JsonObject {
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new CliError(`Expected NAME:TYPE[:FORMAT] for --source-field, got: ${value}`);
  }
  const field: JsonObject = {
    name: parts[0],
    dataType: parts[1]
  };
  if (parts[2]) {
    field.format = parts[2];
  }
  return field;
}

function parseDloField(value: string): JsonObject {
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 4) {
    throw new CliError(`Expected NAME:TYPE[:pk][:LABEL] for --dlo-field, got: ${value}`);
  }

  const name = parts[0];
  const dataType = parts[1];
  let isPrimaryKey = false;
  let label = name;

  for (const extra of parts.slice(2)) {
    if (extra.toLowerCase() === "pk") {
      isPrimaryKey = true;
    } else if (extra.length > 0) {
      label = extra;
    }
  }

  return {
    name,
    label,
    dataType,
    isPrimaryKey
  };
}

function parseMapping(value: string): JsonObject {
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) {
    throw new CliError(`Expected SOURCE:TARGET[:RETURNTYPE] for --mapping, got: ${value}`);
  }
  const mapping: JsonObject = {
    sourceFieldLabel: parts[0],
    targetFieldName: parts[1]
  };
  if (parts[2]) {
    mapping.targetFieldReturntype = parts[2];
  }
  return mapping;
}

function parseFormula(value: string): JsonObject {
  const parts = value.split(":", 3);
  if (parts.length !== 3) {
    throw new CliError(`Expected TARGET:RETURNTYPE:FORMULA for --formula, got: ${value}`);
  }
  return {
    targetFieldName: parts[0],
    targetFieldReturntype: parts[1],
    transformationFormula: parts[2]
  };
}

function validatePayload(payload: DataStreamPayload): void {
  const required = ["name", "label", "connectorInfo", "sourceFields", "mappings", "refreshConfig"];
  const missing = required.filter((key) => !(key in payload));
  if (missing.length > 0) {
    throw new CliError(`Payload is missing required properties: ${missing.join(", ")}`);
  }

  if (payload.dataLakeObjectInfo && payload.existingDataLakeObjectInfo) {
    throw new CliError("Payload can contain only one of dataLakeObjectInfo or existingDataLakeObjectInfo.");
  }
  if (!payload.dataLakeObjectInfo && !payload.existingDataLakeObjectInfo) {
    throw new CliError("Payload must contain dataLakeObjectInfo or existingDataLakeObjectInfo.");
  }
  if (!Array.isArray(payload.sourceFields) || payload.sourceFields.length === 0) {
    throw new CliError("sourceFields must be a non-empty array.");
  }

  const connectorType = payload.connectorInfo?.connectorType;
  const mappingsAllowedToBeEmpty = connectorType === "SalesforceDotCom";
  if (!Array.isArray(payload.mappings) || (payload.mappings.length === 0 && !mappingsAllowedToBeEmpty)) {
    throw new CliError("mappings must be a non-empty array.");
  }

  if (payload.dataLakeObjectInfo) {
    const dloFields = getObjectValue(payload.dataLakeObjectInfo, "dataLakeFieldInputRepresentations");
    if (!Array.isArray(dloFields) || dloFields.length === 0) {
      throw new CliError("dataLakeObjectInfo.dataLakeFieldInputRepresentations must be a non-empty array.");
    }
  }
}

function validateConnectionPayload(payload: ConnectionPayload): void {
  const required = ["connectorType", "label", "method", "credentials", "parameters"];
  const missing = required.filter((key) => !(key in payload));
  if (missing.length > 0) {
    throw new CliError(`Connection payload is missing required properties: ${missing.join(", ")}`);
  }

  if (!Array.isArray(payload.credentials) || payload.credentials.length === 0) {
    throw new CliError("credentials must be a non-empty array.");
  }
  if (!Array.isArray(payload.parameters) || payload.parameters.length === 0) {
    throw new CliError("parameters must be a non-empty array.");
  }
}

async function requestJson(input: {
  method: string;
  instanceUrl: string;
  accessToken: string;
  apiVersion: string;
  dataspace?: string;
  path: string;
  payload?: JsonObject;
  query?: Record<string, string>;
}): Promise<JsonObject> {
  const url = buildUrl(input.instanceUrl, input.apiVersion, input.path, input.dataspace, input.query);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.accessToken}`,
    Accept: "application/json"
  };
  let body: string | undefined;
  if (input.payload) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(input.payload);
  }
  const response = await fetch(url, {
    method: input.method,
    headers,
    body
  });

  const text = await response.text();
  if (!response.ok) {
    throw new CliError(`API request failed with HTTP ${response.status}: ${text}`);
  }
  if (text.trim().length === 0) {
    return {};
  }
  return JSON.parse(text) as JsonObject;
}

async function soapLogin(input: {
  username: string;
  password: string;
  securityToken?: string;
  loginUrl: string;
  apiVersion: string;
}): Promise<{ instanceUrl: string; accessToken: string }> {
  const versions = [input.apiVersion, ...SOAP_LOGIN_FALLBACK_VERSIONS.filter((version) => version !== input.apiVersion)];
  let lastError: string | undefined;

  for (const version of versions) {
    const url = new URL(`/services/Soap/u/${version}`, input.loginUrl).toString();
    const soapBody = buildSoapLoginEnvelope({
      username: input.username,
      password: `${input.password}${input.securityToken ?? ""}`
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
        SOAPAction: "login"
      },
      body: soapBody
    });

    const text = await response.text();
    const faultString = extractXmlTag(text, "faultstring");
    if (!response.ok || faultString) {
      lastError = faultString ?? text;
      if (lastError.includes("SOAP Login operation is not available in the API version specified")) {
        continue;
      }
      throw new CliError(`SOAP login failed: ${lastError}`);
    }

    const sessionId = extractXmlTag(text, "sessionId");
    const serverUrl = extractXmlTag(text, "serverUrl");
    if (!sessionId || !serverUrl) {
      throw new CliError("SOAP login succeeded but the response did not contain sessionId and serverUrl.");
    }

    return {
      accessToken: decodeXml(sessionId),
      instanceUrl: new URL(decodeXml(serverUrl)).origin
    };
  }

  throw new CliError(`SOAP login failed: ${lastError ?? "no supported SOAP login API version succeeded."}`);
}

function buildSoapLoginEnvelope(input: { username: string; password: string }): string {
  const username = escapeXml(input.username);
  const password = escapeXml(input.password);
  return `<?xml version="1.0" encoding="utf-8"?>
<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
  <env:Body>
    <n1:login xmlns:n1="urn:partner.soap.sforce.com">
      <n1:username>${username}</n1:username>
      <n1:password>${password}</n1:password>
    </n1:login>
  </env:Body>
</env:Envelope>`;
}

function extractXmlTag(xml: string, tagName: string): string | undefined {
  const pattern = new RegExp(`<([A-Za-z0-9_]+:)?${tagName}>([\\s\\S]*?)</([A-Za-z0-9_]+:)?${tagName}>`);
  const match = pattern.exec(xml);
  return match?.[2];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function buildUrl(
  instanceUrl: string,
  apiVersion: string,
  path: string,
  dataspace?: string,
  query?: Record<string, string>
): string {
  const url = new URL(`/services/data/v${apiVersion}${path}`, instanceUrl);
  if (dataspace) {
    url.searchParams.set("dataspace", dataspace);
  }
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function buildConnectorListQuery(options: Options): Record<string, string> {
  const query: Record<string, string> = {};
  if (options.fieldGroup) {
    query.fieldGroup = options.fieldGroup;
  }
  if (options.filters) {
    query.filters = options.filters;
  }
  if (options.orderBy) {
    query.orderBy = options.orderBy;
  }
  return query;
}

function getObjectValue(object: JsonObject, key: string): JsonValue | undefined {
  return object[key];
}

function printJson(value: JsonValue): void {
  console.log(JSON.stringify(value, null, 2));
}

function printRootHelp(): void {
  console.log(`usage: dc-cli <command>

Commands:
  connector     List connector types and fetch connector metadata
  connection    Manage Data 360 connections
  data-stream   Manage data streams

Run 'dc-cli connector --help' or 'dc-cli data-stream create --help' for command options.`);
}

function printHelp(command?: string, subcommand?: string): void {
  if (!command) {
    printRootHelp();
    return;
  }

  if (command === "data-stream") {
    if (!subcommand) {
      printDataStreamHelp();
      return;
    }
    if (subcommand === "create") {
      printCreateHelp();
      return;
    }
  }

  if (command === "connector") {
    printConnectorHelp();
    return;
  }

  if (command === "connection") {
    if (!subcommand) {
      printConnectionHelp();
      return;
    }
    if (subcommand === "create") {
      printConnectionCreateHelp();
      return;
    }
    if (subcommand === "databases") {
      printConnectionDatabasesHelp();
      return;
    }
  }

  printRootHelp();
}

function printDataStreamHelp(): void {
  console.log(`usage: dc-cli data-stream <command>

Commands:
  create   Create a Data 360 data stream`);
}

function printConnectorHelp(): void {
  console.log(`usage: dc-cli connector <command>

Commands:
  list       List Data 360 connector types from GET /ssot/connectors
  metadata   Get connector metadata from GET /ssot/connectors/{connectorType}

List options:
  --instance-url <url>
  --access-token <token>
  --username <value>
  --password <value>
  --security-token <value>
  --login-url <url>
  --api-version <version>
  --dataspace <name>
  --field-group <value>
  --filters <value>
  --order-by <value>

Metadata options:
  --instance-url <url>
  --access-token <token>
  --username <value>
  --password <value>
  --security-token <value>
  --login-url <url>
  --api-version <version>
  --dataspace <name>
  --connector-metadata-type <value>
  --connector-type <value>`);
}

function printConnectionHelp(): void {
  console.log(`usage: dc-cli connection <command>

Commands:
  create      Create a Data 360 connection through POST /ssot/connections
  databases   Get databases through POST /ssot/connections/{connectionId}/databases`);
}

function printCreateHelp(): void {
  console.log(`usage: dc-cli data-stream create [options]

Create a data stream through POST /ssot/data-streams.

You can provide either:
  1. --payload-file with the exact Connect API request body as JSON
  2. individual flags and repeated field/mapping options

Options:
  --instance-url <url>
  --access-token <token>
  --username <value>
  --password <value>
  --security-token <value>
  --login-url <url>
  --api-version <version>
  --dataspace <name>
  --dry-run
  --run-after-create
  --payload-file <path>
  --name <value>
  --label <value>
  --datastream-type <value>
  --datasource <value>
  --connector-type <value>
  --connector-name <value>
  --connector-detail KEY=VALUE
  --existing-dlo <value>
  --dlo-name <value>
  --dlo-label <value>
  --dlo-category <value>
  --event-datetime-field <value>
  --record-modified-field <value>
  --org-unit-identifier-field <value>
  --dlo-field NAME:TYPE[:pk][:LABEL]
  --source-field NAME:TYPE[:FORMAT]
  --mapping SOURCE:TARGET[:RETURNTYPE]
  --formula TARGET:RETURNTYPE:FORMULA
  --advanced-attribute KEY=VALUE
  --refresh-mode <value>
  --frequency-type <value>
  --hour <value>
  --day-of-week <value>
  --day-of-month <value>
  --acceleration-enabled`);
}

function printConnectionCreateHelp(): void {
  console.log(`usage: dc-cli connection create [options]

Create a Data 360 connection through POST /ssot/connections.

You can provide either:
  1. --payload-file with the exact Connect API request body as JSON
  2. individual flags and repeated credential/parameter options

Options:
  --instance-url <url>
  --access-token <token>
  --username <value>
  --password <value>
  --security-token <value>
  --login-url <url>
  --api-version <version>
  --dataspace <name>
  --dry-run
  --payload-file <path>
  --connector-type <value>
  --label <value>
  --name <value>
  --method <value>
  --credential NAME=VALUE
  --credential-file NAME=PATH
  --parameter NAME=VALUE`);
}

function printConnectionDatabasesHelp(): void {
  console.log(`usage: dc-cli connection databases [options]

Get databases for an existing Data 360 connection through POST /ssot/connections/{connectionId}/databases.

Options:
  --instance-url <url>
  --access-token <token>
  --username <value>
  --password <value>
  --security-token <value>
  --login-url <url>
  --api-version <version>
  --dataspace <name>
  --connection-id <value>`);
}

void main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
