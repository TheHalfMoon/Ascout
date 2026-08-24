export function normalizeLcov(input: string): string {
  const lines = input.split(/\r?\n/);
  const output: string[] = [];
  let inRecord = false;
  let currentRecord: string[] = [];

  for (const line of lines) {
    if (line.startsWith("TN:")) {
      // Start of a new record
      if (inRecord && currentRecord.length > 0) {
        // Finish previous record
        output.push(...currentRecord);
        output.push("end_of_record");
        currentRecord = [];
      }
      inRecord = true;
      // We do not keep TN: line
      continue;
    }
    if (line.startsWith("SF:")) {
      currentRecord.push(line);
      continue;
    }
    if (line.startsWith("DA:")) {
      currentRecord.push(line);
      continue;
    }
    if (line.startsWith("LF:")) {
      currentRecord.push(line);
      continue;
    }
    if (line.startsWith("end_of_record")) {
      if (inRecord) {
        currentRecord.push(line);
        output.push(...currentRecord);
        output.push("end_of_record");
        currentRecord = [];
        inRecord = false;
      }
      continue;
    }
    // Ignore any other lines (like BRDA, BRF, etc.) for line-only normalization
  }

  // If the file ends without an explicit end_of_record, we still close the record
  if (inRecord && currentRecord.length > 0) {
    output.push(...currentRecord);
    output.push("end_of_record");
  }

  return output.join("\n");
}