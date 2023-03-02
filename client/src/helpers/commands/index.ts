import { Uri, ViewColumn, commands, window } from "vscode";
import path = require("path");
import { parseOutput, runRubyScript } from "../index";

export type CommandHandlerType = {
  command: string;
  commandHandler: () => void;
};
export const setupConfigCommmandHandler = (): CommandHandlerType => {
  const command = "fastlane-intellisense.setupConfig";

  const commandHandler = () => {
    const devRegex =
      /^(.*?[\\/])[a-zA-Z]:?[\\/]?[^\\/]*?[\\/]?fastlane-intellisense[\\/]/g;
    const prodRegex =
      /^(.*?[\\/])[a-zA-Z]:?[\\/]?[^\\/]*?[\\/]?vikmanatus\.fastlane-intellisense-.*?[\\/]/g;
    const regex = process.env.NODE_ENV === "development" ? devRegex : prodRegex;
    const matchPath = __dirname.match(regex);
    if (matchPath) {
      const scriptPath = path.join(
        __dirname,
        "../../../src/scripts/get_fastlane_actions.rb"
      );
      const actionsOutputPath = path.join(
        __dirname,
        "../../../../server/src/actions_list.json"
      );
      return runRubyScript(scriptPath)
        .then((result) => parseOutput(result.stdout, actionsOutputPath))
        .then(() => {
          window.showInformationMessage(
            "Actions list for autocompletion has been created"
          );
        })
        .catch((_error) => {
          window.showErrorMessage("Internal error");
        });
    } else {
      window.showErrorMessage(
        "There seems to be an issue with your fastlane setup"
      );
    }
  };
  return { command, commandHandler };
};

export const setupVirtualDocumentCommandHandler = (): CommandHandlerType => {
  const command = "fastlane-intellisense.openTextDoc";
  const commandHandler = async () => {
    const uri = Uri.parse("fastlane-intellisense:" + "fastlane-match-doc.md");
    await commands.executeCommand(
      "markdown.showPreviewToSide",
      uri,
      ViewColumn.Beside
    );
  };
  return { command, commandHandler };
};
