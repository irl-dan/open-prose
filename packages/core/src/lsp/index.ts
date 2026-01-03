/**
 * OpenProse LSP Module
 */

export type {
  SemanticToken,
  EncodedSemanticTokens,
  SemanticTokensLegend,
} from './semantic-tokens';

export {
  SemanticTokenType,
  SemanticTokenModifier,
  SemanticTokensProvider,
  getSemanticTokensLegend,
  getSemanticTokens,
  getEncodedSemanticTokens,
} from './semantic-tokens';
