export class WebExtensionDBError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigurationError extends WebExtensionDBError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
  }
}

export class ValidationError extends WebExtensionDBError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class StorageError extends WebExtensionDBError {
  constructor(message: string) {
    super(message, "STORAGE_ERROR");
  }
}
