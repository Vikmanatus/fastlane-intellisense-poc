import { FastlaneConfigType, actions_list } from "@/shared/src/config";
import {
  CancellationToken,
  CompletionContext,
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionItemTag,
  CompletionList,
  ExtensionContext,
  MarkdownString,
  Position,
  ProviderResult,
  Range,
  SnippetString,
  TextDocument,
  languages,
} from "vscode";
import Provider from "../logic/Provider";

class ActionCompletionProvider
  extends Provider
  implements CompletionItemProvider
{
  public init(): boolean {
    console.log("Initializing ActionCompletionProvider");
    return true;
  }
  public registerProvider(context: ExtensionContext): void {
    context.subscriptions.push(
      languages.registerCompletionItemProvider("ruby", this, ...["(", ","])
    );
  }
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
    // get all text until the `position` and check if it reads `console.`
    // and if so then complete if `log`, `warn`, and `error`
    const linePrefix = document
    .lineAt(position)
    .text.substring(0, position.character);
    const actionName = "slack";
    const regex =new RegExp(`\\b${actionName}\\s*\\(\\s*([\\s\\S]*?)\\)`, 'gm');
    //Math.max(0, position.line - 1)
    const matchMulti = document.getText(new Range(position.line - 1, 0, document.lineCount, 0)).match(regex);
    console.log({matchMulti});
    if (matchMulti) {
      const functionBlock = matchMulti[0];
      console.log({functionBlock});
      const actionNameMatch = functionBlock.match(/^\s*([a-z_]+)/i);
      const actionName = actionNameMatch ? actionNameMatch[1] : null;
      console.log({ actionName });
      // Now you can do something with functionBlock...
    }


    const matchAction = /[a-z_]+\s*\(\s*([^)]*)$/;
    const match = linePrefix.match(matchAction);

    if (!match) {
      return null;
    }

    const existingArgsLine = match[1];
    const existingArgs = this.parseArgs(existingArgsLine);
    //console.log({ existingArgs });
    const actionPattern =
      /(\b[a-z]+(?:_[a-z]+)*\b)(?=\s*\(|\s*\(\s*\)|\s*\(\s*\w+\s*:\s*\w+\s*(?:,\s*\w+\s*:\s*\w+\s*)*\)|$)/;

    const matchActionName = actionPattern.exec(linePrefix.trim());
    if (!matchActionName || matchActionName.length < 1) {
      //console.log({ matchActionName });
      return null;
    }
    const extractedActionName = matchActionName[1];
    const actionElement = actions_list.filter(
      (element) => element.action_name === extractedActionName
    );
    if (!actionElement.length) {
      return null;
    }
    const actionArgs = actionElement[0].args;
    if (!actionArgs) {
      return null;
    }
    const remainingArgs = actionArgs.filter(
      (arg) => !existingArgs.includes(arg.key)
    );

    const completionItems = remainingArgs.map((arg) =>
      this.generateArgument(arg)
    );
    //console.log("returning items", completionItems);
    return completionItems;
  }
  private isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0;
  }
  private generateRubyHash(configItem: FastlaneConfigType): string {
    const entries = Object.entries(configItem.default_value as object)
      .map(([key, value]) => `"${key}" => "${value}"`)
      .join(", ");
    return `${configItem.key}: { ${entries} }`;
  }
  private handleConfigDefaultValue(configItem: FastlaneConfigType) {
    let defaultValue = configItem.key + ': ${1:"your_' + configItem.key + '"}';

    switch (configItem.data_type) {
      case "String":
      case "Hash":
        if (configItem.default_value) {
          if (typeof configItem.default_value === "object") {
            if (this.isEmpty(configItem.default_value)) {
              defaultValue = configItem.key + ": ${1:{}}";
              break;
            }
            defaultValue = this.generateRubyHash(configItem);
            break;
          }
          defaultValue =
            configItem.key + ': ${1:"' + configItem.default_value + '"}';
        }
        break;
      case "Fastlane::Boolean":
      case "Integer":
        if (typeof configItem.default_value !== "undefined") {
          defaultValue =
            configItem.key + ": ${1:" + configItem.default_value + "}";
        }
        break;
      case "Array":
        if (Array.isArray(configItem.default_value)) {
          const defaultValueArray = configItem.default_value
            .map((value: string) => `"${value}"`)
            .join(", ");
          defaultValue = configItem.key + ": ${1:[" + defaultValueArray + "]}";
          break;
        }
        defaultValue = configItem.key + ": ${1:[]}";
        break;
    }
    return new SnippetString(defaultValue);
  }
  generateArgument(fastalneArg: FastlaneConfigType): CompletionItem {
    const argName = fastalneArg.key;
    const arg = new CompletionItem(argName, CompletionItemKind.Property);
    const defaultValues = this.handleConfigDefaultValue(fastalneArg);
    arg.insertText = defaultValues;
    if (fastalneArg.description) {
      arg.documentation = new MarkdownString(fastalneArg.description);
      if (fastalneArg.description.match(/\*\*DEPRECATED!\*\*/)) {
        arg.tags = [CompletionItemTag.Deprecated];
      }
    }
    arg.filterText = defaultValues.value;
    return arg;
  }
  parseArgs(linePrefix: string) {
    const argPattern = /(\w+):/g;
    let match;
    const args = [];
    while ((match = argPattern.exec(linePrefix)) !== null) {
      args.push(match[1]);
    }
    return args;
  }
}

export default ActionCompletionProvider;
