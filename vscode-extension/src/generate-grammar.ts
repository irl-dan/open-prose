import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	BeginEndRule,
	emitJSON,
	Grammar,
	MatchRule,
	meta,
	schema,
} from "tmlanguage-generator";
import { KEYWORDS, TokenType } from "../../plugin/src/parser/tokens";
import {
	VALID_JOIN_STRATEGIES,
	VALID_MODELS,
	VALID_ON_FAIL_POLICIES,
} from "../../plugin/src/validator";

type Rule = MatchRule | BeginEndRule;

// Group keywords by their semantic category
const keywordGroups: Record<string, { scope: string; types: TokenType[] }> = {
	"control-keywords": {
		scope: "keyword.control.prose",
		types: [
			TokenType.IF,
			TokenType.ELIF,
			TokenType.ELSE,
			TokenType.TRY,
			TokenType.CATCH,
			TokenType.FINALLY,
			TokenType.THROW,
			TokenType.LOOP,
			TokenType.WHILE,
			TokenType.UNTIL,
			TokenType.REPEAT,
			TokenType.FOR,
			TokenType.IN,
			TokenType.AS,
			TokenType.CHOICE,
			TokenType.OPTION,
			TokenType.PARALLEL,
			TokenType.DO,
		],
	},
	"declaration-keywords": {
		scope: "keyword.declaration.prose",
		types: [TokenType.AGENT, TokenType.SESSION, TokenType.BLOCK],
	},
	"binding-keywords": {
		scope: "keyword.other.binding.prose",
		types: [TokenType.LET, TokenType.CONST, TokenType.IMPORT, TokenType.FROM],
	},
	"property-keywords": {
		scope: "keyword.other.property.prose",
		types: [
			TokenType.MODEL,
			TokenType.PROMPT,
			TokenType.SKILLS,
			TokenType.PERMISSIONS,
			TokenType.CONTEXT,
			TokenType.RETRY,
			TokenType.BACKOFF,
		],
	},
	"pipeline-keywords": {
		scope: "keyword.operator.pipeline.prose",
		types: [TokenType.MAP, TokenType.FILTER, TokenType.REDUCE, TokenType.PMAP],
	},
};

// Build keyword rules from KEYWORDS map
function buildKeywordRule(
	key: string,
	scope: string,
	types: TokenType[],
): Rule {
	const words = Object.entries(KEYWORDS)
		.filter(([_, type]) => types.includes(type))
		.map(([word]) => word);
	return { key, scope, match: `\\b(${words.join("|")})\\b` };
}

const keywordRules = Object.entries(keywordGroups).map(
	([key, { scope, types }]) => buildKeywordRule(key, scope, types),
);

const comment: Rule = {
	key: "comment",
	scope: "comment.line.number-sign.prose",
	match: "#.*$",
};

const stringEscapes: Rule = {
	key: "string-escapes",
	scope: "constant.character.escape.prose",
	match: '\\\\[nrt\\\\"0]|\\\\u[0-9a-fA-F]{4}',
};

const stringInterpolation: Rule = {
	key: "string-interpolation",
	scope: meta,
	match: "(\\{)([a-zA-Z_][a-zA-Z0-9_-]*)(\\})",
	captures: {
		1: { scope: "punctuation.definition.interpolation.begin.prose" },
		2: { scope: "variable.other.interpolation.prose" },
		3: { scope: "punctuation.definition.interpolation.end.prose" },
	},
};

const tripleString: Rule = {
	key: "triple-string",
	scope: "string.quoted.triple.prose",
	begin: '"""',
	end: '"""',
	patterns: [stringEscapes, stringInterpolation],
};

const doubleString: Rule = {
	key: "double-string",
	scope: "string.quoted.double.prose",
	begin: '"',
	end: '"',
	patterns: [stringEscapes, stringInterpolation],
};

const multilineDiscretion: Rule = {
	key: "multiline-discretion",
	scope: "markup.italic.discretion.multiline.prose",
	begin: "\\*\\*\\*",
	end: "\\*\\*\\*",
};

const inlineDiscretion: Rule = {
	key: "inline-discretion",
	scope: "markup.italic.discretion.inline.prose",
	begin: "\\*\\*",
	end: "\\*\\*",
};

const operators: Rule = {
	key: "operators",
	scope: "keyword.operator.prose",
	match: "->|\\||=",
};

const punctuation: Rule = {
	key: "punctuation",
	scope: "punctuation.prose",
	match: ":|,|\\(|\\)|\\[|\\]|\\{|\\}",
};

const numbers: Rule = {
	key: "numbers",
	scope: "constant.numeric.prose",
	match: "\\b[0-9]+(\\.[0-9]+)?\\b",
};

const modelConstants: Rule = {
	key: "model-constants",
	scope: "constant.language.model.prose",
	match: `\\b(${VALID_MODELS.join("|")})\\b`,
};

const joinStrategyConstants: Rule = {
	key: "join-strategy-constants",
	scope: "constant.language.join.prose",
	match: `"(${VALID_JOIN_STRATEGIES.join("|")})"`,
};

const onFailPolicyConstants: Rule = {
	key: "on-fail-policy-constants",
	scope: "constant.language.policy.prose",
	match: `"(${VALID_ON_FAIL_POLICIES.join("|")})"`,
};

const identifiers: Rule = {
	key: "identifiers",
	scope: "variable.other.prose",
	match: "\\b[a-zA-Z_][a-zA-Z0-9_-]*\\b",
};

const grammar: Grammar = {
	$schema: schema,
	name: "OpenProse",
	scopeName: "source.prose",
	fileTypes: ["prose"],
	patterns: [
		comment,
		tripleString,
		doubleString,
		multilineDiscretion,
		inlineDiscretion,
		...keywordRules,
		operators,
		punctuation,
		numbers,
		modelConstants,
		joinStrategyConstants,
		onFailPolicyConstants,
		identifiers,
	],
};

const json = await emitJSON(grammar);
const outPath = resolve(__dirname, "../syntaxes/prose.tmLanguage.json");
writeFileSync(outPath, json);
console.log(`Generated ${outPath}`);
