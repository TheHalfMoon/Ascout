from pathlib import Path

path = Path("src/check.ts")
text = path.read_text()


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one match, found {count}: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once(
    'import { normalizeLcovLineCoverage, type LcovLinePoint } from "./coverage/lcov.js";\n',
    'import { normalizeLcovLineCoverage, type LcovLinePoint } from "./coverage/lcov.js";\nimport { buildChangedLineExercise } from "./exercise.js";\n',
)

replace_once(
    '''function emptyExercise(): ExerciseV1 {\n  // Changed-line exercise proof arrives with US2; until then the receipt keeps\n  // the exercise section empty, which forces materially_incomplete and exit 4.\n''',
    '''function emptyExercise(): ExerciseV1 {\n  // No usable normalized test coverage means T055 has no trustworthy line\n  // intersection input. Task/selection/error semantics still keep the run\n  // incomplete without inventing exercise evidence.\n''',
)

replace_once(
    '''      const tasks: TaskResultV1[] = [];\n      const evidence: EvidenceV1[] = [];\n      const artifacts: ArtifactV1[] = [];\n''',
    '''      const tasks: TaskResultV1[] = [];\n      const evidence: EvidenceV1[] = [];\n      const artifacts: ArtifactV1[] = [];\n      let exerciseCoveragePoints: readonly LcovLinePoint[] | null = null;\n''',
)

replace_once(
    '''          executed = finalExecuted;\n        } else {\n''',
    '''          exerciseCoveragePoints = finalExecuted.coveragePoints;\n          executed = finalExecuted;\n        } else {\n''',
)

replace_once(
    '''      const sourceEnd = composeSourceState(root);\n\n      const receipt = buildReceipt({\n''',
    '''      const exercise = exerciseCoveragePoints === null\n        ? emptyExercise()\n        : buildChangedLineExercise(gitComparison.changed_files, exerciseCoveragePoints, "test");\n      const sourceEnd = composeSourceState(root);\n\n      const receipt = buildReceipt({\n''',
)

replace_once(
    '''        tasks,\n        exercise: emptyExercise(),\n        testChanges: [] satisfies readonly TestChangeV1[],\n''',
    '''        tasks,\n        exercise,\n        testChanges: [] satisfies readonly TestChangeV1[],\n''',
)

path.write_text(text)
