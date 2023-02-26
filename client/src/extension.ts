/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import {
  workspace,
  ExtensionContext,
  languages,
  TextDocument,
  CancellationToken,
  DefinitionProvider,
  Location,
  Position,
  Range,
  Uri,
  window,
} from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import {
  convertToClassName,
  fileExists,
  parseOutput,
  runRubyScript,

} from "./utils";

let client: LanguageClient;

class GoDefinitionProvider implements DefinitionProvider {
  private findFunctionDefinition(
    document: TextDocument,
    actionName: string
  ): Position {
    const regex = new RegExp(`\\b${actionName}\\b`, "i");
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const match = line.text.match(regex);
      if (match) {
        return new Position(i, match.index);
      }
    }
    return null;
  }
  public async provideDefinition(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Promise<Location> {
    // TODO: need to escape parenthesis inside text_element
    const range = document.lineAt(position).range;
    const text_element = document.getText(range).trim();

    const targetPath = `/Users/vikmanatus/.rvm/gems/ruby-2.7.5/gems/fastlane-2.212.1/fastlane/lib/fastlane/actions/${text_element}.rb`;
    const file_exists = fileExists(targetPath);

    if (file_exists) {
      const targetDocument = await workspace.openTextDocument(targetPath);
      const targetPosition = this.findFunctionDefinition(
        targetDocument,
        convertToClassName(text_element)
      );
      return Promise.resolve(
        new Location(
          Uri.file(targetPath),
          new Range(targetPosition, targetPosition)
        )
      );
    }
    return null;
  }
}
export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js")
  );
  context.subscriptions.push(
    languages.registerDefinitionProvider(
      { scheme: "file", language: "ruby" },
      new GoDefinitionProvider()
    )
  );
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: "file", language: "ruby" }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "languageServerExample",
    "Language Server Example",
    serverOptions,
    clientOptions
  );
  // TODO: Move this block inside of config function who will be triggered only once
  // return runRubyScript(
  //   "/Users/vikmanatus/Desktop/Projects/Open-Source/Dev-Utils/LSP/fastlane-intellisense/client/src/scripts/get_fastlane_actions.rb"
  // )
  //   .then(({ stdout, stderr }) => {
  //     console.log(`stdout: ${stdout}`);
  //     console.error(`stderr: ${stderr}`);
  //     return parseOutput(
  //       stdout,
  //       "/Users/vikmanatus/Desktop/Projects/Open-Source/Dev-Utils/LSP/fastlane-intellisense/output.json"
  //     )
  //       .then(() => {
  //       // Start the client. This will also launch the server
   
  //       })
  //       .catch((err) => {
  //         return err;
  //       });
  //   })
  //   .catch((error) => {
  //     const err = error;
  //     console.error(`runRubyScript error: ${error}`);
  //   });

    client.start();
    window.showInformationMessage("My extension is now active!");
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
