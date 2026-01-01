# OpenProse Execution Evaluation Rubric

This rubric defines the criteria for evaluating AI agent execution of OpenProse programs.

## Scoring Scale

All criteria are scored on a 1-5 scale:
- **5 - Excellent**: Exceptional performance, exceeds expectations
- **4 - Good**: Solid performance, meets all expectations
- **3 - Acceptable**: Adequate performance with minor issues
- **2 - Poor**: Significant issues that impact quality
- **1 - Very Poor**: Fundamental failures or complete inability

## Passing Threshold

A test is considered **PASSED** when:
- Average score across all criteria >= 4.0
- No individual criterion scores below 3

## Evaluation Criteria

### 1. Control Flow Accuracy (Weight: High)

**Question**: Did the execution accurately follow the program's control flow?

**What to look for**:
- Statements executed in correct order
- Sequential flow maintained properly
- No skipped or duplicated statements
- Proper handling of program structure

**Score Guide**:
- 5: Perfect control flow, every statement in exact order
- 4: Correct flow with minor verbosity or clarification
- 3: Mostly correct with some unnecessary steps
- 2: Significant flow issues, wrong order or skipped statements
- 1: Complete failure to follow program flow

### 2. Clarity of Execution (Weight: Medium)

**Question**: Did the agent appear confused or lost during execution?

**What to look for**:
- Clear, purposeful actions
- Consistent understanding of program intent
- No backtracking or confusion
- Confident progression through the program

**Score Guide**:
- 5: Crystal clear execution, no hesitation
- 4: Clear execution with minor clarifications
- 3: Some uncertainty but recovers
- 2: Frequent confusion or restarts
- 1: Completely lost, cannot proceed

### 3. Intelligent Judgment (Weight: Medium)

**Question**: Did the agent show good judgment on context and ambiguity?

**What to look for**:
- Reasonable interpretation of ambiguous constructs
- Good decisions on context passing
- Sensible handling of edge cases
- Pragmatic approach to undefined behaviors

**Score Guide**:
- 5: Exceptional judgment, handles all ambiguity well
- 4: Good judgment with reasonable interpretations
- 3: Acceptable decisions, some questionable choices
- 2: Poor judgment, frequent bad decisions
- 1: Completely unreasonable interpretations

### 4. Feature Handling (Weight: High)

**Question**: Did the agent accurately handle the specific language feature being tested?

**What to look for**:
- Correct recognition of the feature syntax
- Proper interpretation of feature semantics
- Correct behavior for the feature type
- Handling of edge cases within the feature

**Specific features**:
- **Comments**: Should be ignored completely, not executed
- **Strings**: Should preserve content, handle escapes, quotes
- **Sessions**: Should start/manage sessions properly
- **Variables**: Should store/retrieve values correctly
- **Conditions**: Should evaluate and branch properly

**Score Guide**:
- 5: Perfect feature handling, all edge cases covered
- 4: Correct handling with minor imperfections
- 3: Basic functionality works, some issues
- 2: Major feature misunderstanding
- 1: Complete failure to handle the feature

### 5. State Management (Weight: High)

**Question**: Did the agent manage state correctly?

**What to look for**:
- Variables retained across statements
- Context preserved between operations
- No unexplained state loss
- Consistent state representation

**Score Guide**:
- 5: Perfect state management throughout
- 4: State maintained with minor issues
- 3: Some state inconsistencies, recoverable
- 2: Significant state loss or corruption
- 1: Complete inability to manage state

### 6. Task Completion (Weight: High)

**Question**: Was the overall task completed successfully?

**What to look for**:
- Program executed from start to finish
- All required outputs produced
- No crashes or unhandled errors
- Final state is correct

**Score Guide**:
- 5: Complete success, all objectives met
- 4: Completed with minor deviations
- 3: Partially completed, main goal achieved
- 2: Significant incompleteness
- 1: Task not completed at all

### 7. Compile Phase (Weight: Medium)

**Question**: Did the compile/parse phase work correctly?

**What to look for**:
- Syntax correctly recognized
- Structure properly identified
- Error messages for invalid syntax (if applicable)
- Preparation for execution phase

**Score Guide**:
- 5: Perfect parsing, clear understanding
- 4: Correct parsing with minor notes
- 3: Parsing works but with issues
- 2: Significant parsing problems
- 1: Cannot parse the program

### 8. Bootup Smoothness (Weight: Low)

**Question**: Did the execution begin smoothly?

**What to look for**:
- Quick initialization
- No setup errors
- Clear start of execution
- Proper environment preparation

**Score Guide**:
- 5: Instant, smooth bootup
- 4: Quick start with minor setup
- 3: Some delays but starts successfully
- 2: Significant bootup issues
- 1: Cannot start execution

## Additional Notes for Judges

1. **Be objective**: Base scores on observable behavior, not assumptions
2. **Consider context**: Simpler programs should still receive high scores if executed well
3. **Distinguish severity**: Minor issues should not heavily impact scores
4. **Document evidence**: Always cite specific examples for your scores
5. **Overall coherence**: The agent should demonstrate coherent understanding of OpenProse
