export * from "./model-core.js";

import {
  validateReceiptSemantics as validateCoreReceiptSemantics,
  type ReceiptSemanticIssue,
  type ReceiptSemanticValidationResult,
  type ReceiptV1,
} from "./model-core.js";

function validateCommandSurfaceFileFacts(
  receipt: ReceiptV1,
  issues: ReceiptSemanticIssue[],
): void {
  const reportedFileMismatches = new Set<number>();

  for (const [taskIndex, task] of receipt.tasks.entries()) {
    for (const [authorityIndex, authorityPath] of task.changed_authority_paths.entries()) {
      const matches = receipt.comparison.changed_files
        .map((file, fileIndex) => ({ file, fileIndex }))
        .filter(
          ({ file }) =>
            file.path === authorityPath || file.previous_path === authorityPath,
        );

      if (matches.length === 0) {
        issues.push({
          code: "changed_authority_path_not_in_comparison",
          path: `tasks[${taskIndex}].changed_authority_paths[${authorityIndex}]`,
          message: "changed authority path must resolve to a current comparison path or rename previous_path",
        });
        continue;
      }

      for (const { file, fileIndex } of matches) {
        if (file.is_command_surface || reportedFileMismatches.has(fileIndex)) continue;
        reportedFileMismatches.add(fileIndex);
        issues.push({
          code: "command_surface_file_fact_mismatch",
          path: `comparison.changed_files[${fileIndex}].is_command_surface`,
          message: "changed file matched by task authority must be marked is_command_surface=true",
        });
      }
    }
  }
}

export function validateReceiptSemantics(
  receipt: ReceiptV1,
): ReceiptSemanticValidationResult {
  const core = validateCoreReceiptSemantics(receipt);
  const issues = [...core.issues];
  validateCommandSurfaceFileFacts(receipt, issues);
  return { valid: issues.length === 0, issues };
}
