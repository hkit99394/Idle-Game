export function getSaveToolErrorMessage(reason: string): string {
  switch (reason) {
    case "empty_import":
      return "Import text is empty";
    case "invalid_json":
      return "Save JSON is invalid";
    case "invalid_save":
      return "Save data is invalid";
    case "invalid_duration":
      return "Offline time travel duration is invalid";
    case "missing_save":
      return "No save found";
    case "storage_error":
      return "Save storage failed";
    default:
      return "Save tool failed";
  }
}
