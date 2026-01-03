import * as vscode from 'vscode';
import { parse, validate, SourceSpan } from '../../plugin/src';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('prose');

  context.subscriptions.push(
    diagnosticCollection,
    vscode.workspace.onDidOpenTextDocument(validateDocument),
    vscode.workspace.onDidChangeTextDocument(e => validateDocument(e.document)),
    vscode.workspace.onDidSaveTextDocument(validateDocument),
    vscode.workspace.onDidCloseTextDocument(doc => diagnosticCollection.delete(doc.uri))
  );

  vscode.workspace.textDocuments.forEach(validateDocument);
}

function validateDocument(document: vscode.TextDocument): void {
  if (document.languageId !== 'prose') return;

  const diagnostics: vscode.Diagnostic[] = [];

  try {
    const parseResult = parse(document.getText());

    for (const error of parseResult.errors) {
      diagnostics.push(createDiagnostic(error.message, error.span, vscode.DiagnosticSeverity.Error));
    }

    if (parseResult.program) {
      const validation = validate(parseResult.program);

      for (const error of validation.errors) {
        diagnostics.push(createDiagnostic(error.message, error.span, vscode.DiagnosticSeverity.Error));
      }
      for (const warning of validation.warnings) {
        diagnostics.push(createDiagnostic(warning.message, warning.span, vscode.DiagnosticSeverity.Warning));
      }
    }
  } catch (err) {
    diagnostics.push(new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 1),
      `Internal error: ${err instanceof Error ? err.message : String(err)}`,
      vscode.DiagnosticSeverity.Error
    ));
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

function createDiagnostic(message: string, span: SourceSpan, severity: vscode.DiagnosticSeverity): vscode.Diagnostic {
  // Convert 1-based (parser) to 0-based (VSCode)
  const range = new vscode.Range(
    span.start.line - 1, span.start.column - 1,
    span.end.line - 1, span.end.column - 1
  );
  const diagnostic = new vscode.Diagnostic(range, message, severity);
  diagnostic.source = 'OpenProse';
  return diagnostic;
}

export function deactivate() {
  diagnosticCollection?.dispose();
}
