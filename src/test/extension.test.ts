import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { z } from "zod";

// Import the functions to test
import { readConfig, Button, Buttons } from "../utils/read";
import { createStatusBarButtons, clearStatusBarButtons } from "../utils/gen";
import { runCommandInTerminal } from "../utils/terminal";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  const testWorkspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

  suite("Config Reading Tests", () => {
    const createTestConfig = (config: object) => {
      if (!testWorkspaceRoot) {
        throw new Error("No workspace folder found");
      }
      const configPath = path.join(testWorkspaceRoot, ".command-buttons.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    };

    const deleteTestConfig = () => {
      if (!testWorkspaceRoot) {
        return;
      }
      const configPath = path.join(testWorkspaceRoot, ".command-buttons.json");
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    };

    teardown(() => {
      deleteTestConfig();
    });

    test("Should read valid config with all fields", () => {
      const validConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            text: "Dev",
            directory: "src",
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(validConfig);
      const result = readConfig();
      assert.ok(result);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].icon, "rocket");
      assert.strictEqual(result[0].color, "#00ffcc");
      assert.strictEqual(result[0].text, "Dev");
      assert.strictEqual(result[0].directory, "src");
      assert.strictEqual(result[0].command, "npm run dev");
    });

    test("Should read valid config with optional fields omitted", () => {
      const validConfig = {
        buttons: [
          {
            icon: "play",
            color: "green",
            command: "npm start",
          },
        ],
      };
      createTestConfig(validConfig);
      const result = readConfig();
      assert.ok(result);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].icon, "play");
      assert.strictEqual(result[0].text, undefined);
      assert.strictEqual(result[0].directory, undefined);
    });

    test("Should read multiple buttons", () => {
      const validConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            text: "Dev",
            command: "npm run dev",
          },
          {
            icon: "package",
            color: "orange",
            text: "Build",
            command: "npm run build",
          },
          {
            icon: "beaker",
            color: "green",
            command: "npm test",
          },
        ],
      };
      createTestConfig(validConfig);
      const result = readConfig();
      assert.ok(result);
      assert.strictEqual(result.length, 3);
    });

    test("Should return undefined for missing config file", () => {
      deleteTestConfig();
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined for invalid JSON", () => {
      if (!testWorkspaceRoot) {
        return;
      }
      const configPath = path.join(testWorkspaceRoot, ".command-buttons.json");
      fs.writeFileSync(configPath, "{ invalid json }");
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when buttons field is missing", () => {
      createTestConfig({ notButtons: [] });
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when buttons is not an array", () => {
      createTestConfig({ buttons: "not an array" });
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when buttons array is empty", () => {
      createTestConfig({ buttons: [] });
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when icon is missing", () => {
      const invalidConfig = {
        buttons: [
          {
            color: "#00ffcc",
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when icon is empty string", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "",
            color: "#00ffcc",
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when color is missing", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "rocket",
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when color is empty string", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "",
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when command is missing", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when command is empty string", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            command: "",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when icon has wrong type", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: 123,
            color: "#00ffcc",
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when text has wrong type", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            text: 123,
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });

    test("Should return undefined when directory has wrong type", () => {
      const invalidConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            directory: 123,
            command: "npm run dev",
          },
        ],
      };
      createTestConfig(invalidConfig);
      const result = readConfig();
      assert.strictEqual(result, undefined);
    });
  });

  suite("Button Generation Tests", () => {
    let mockContext: vscode.ExtensionContext;

    setup(() => {
      // Create a mock context
      mockContext = {
        subscriptions: [],
      } as any;
    });

    teardown(() => {
      clearStatusBarButtons();
    });

    test("Should create status bar button with all fields", () => {
      const buttons: Buttons = [
        {
          icon: "rocket",
          color: "#00ffcc",
          text: "Dev",
          directory: "src",
          command: "npm run dev",
        },
      ];

      createStatusBarButtons(buttons, mockContext);

      // Check that subscriptions were added
      assert.ok(mockContext.subscriptions.length > 0);
    });

    test("Should create multiple status bar buttons", () => {
      const buttons: Buttons = [
        {
          icon: "rocket",
          color: "#00ffcc",
          text: "Dev",
          command: "npm run dev",
        },
        {
          icon: "package",
          color: "orange",
          text: "Build",
          command: "npm run build",
        },
        {
          icon: "beaker",
          color: "green",
          command: "npm test",
        },
      ];

      createStatusBarButtons(buttons, mockContext);

      // Should have 2 subscriptions per button (item + command)
      assert.strictEqual(mockContext.subscriptions.length, 6);
    });

    test("Should create button without text field", () => {
      const buttons: Buttons = [
        {
          icon: "play",
          color: "green",
          command: "npm start",
        },
      ];

      createStatusBarButtons(buttons, mockContext);

      assert.ok(mockContext.subscriptions.length > 0);
    });

    test("Should clear all status bar buttons", () => {
      const buttons: Buttons = [
        {
          icon: "rocket",
          color: "#00ffcc",
          text: "Dev",
          command: "npm run dev",
        },
      ];

      createStatusBarButtons(buttons, mockContext);
      const subscriptionsCount = mockContext.subscriptions.length;
      assert.ok(subscriptionsCount > 0);

      clearStatusBarButtons();

      // Subscriptions should still exist in context but buttons are disposed
      assert.strictEqual(mockContext.subscriptions.length, subscriptionsCount);
    });

    test("Should handle empty buttons array", () => {
      const buttons: Buttons = [];

      createStatusBarButtons(buttons, mockContext);

      assert.strictEqual(mockContext.subscriptions.length, 0);
    });
  });

  suite("Terminal Command Tests", () => {
    test("Should handle command without directory", () => {
      // This test just verifies the function doesn't throw
      assert.doesNotThrow(() => {
        runCommandInTerminal("echo test");
      });
    });

    test("Should handle command with directory", () => {
      // This test just verifies the function doesn't throw
      assert.doesNotThrow(() => {
        runCommandInTerminal("echo test", "src");
      });
    });

    test("Should handle command with empty directory string", () => {
      // This test just verifies the function doesn't throw
      assert.doesNotThrow(() => {
        runCommandInTerminal("echo test", "");
      });
    });
  });

  suite("Zod Schema Tests", () => {
    test("Button schema should validate correct button", () => {
      const ButtonSchema = z.object({
        icon: z.string().nonempty("Icon is required"),
        color: z.string().min(1, "Color must not be empty"),
        text: z.string().optional(),
        directory: z.string().optional(),
        command: z.string().min(1, "Command must not be empty"),
      });

      const validButton = {
        icon: "rocket",
        color: "#00ffcc",
        text: "Dev",
        command: "npm run dev",
      };

      const result = ButtonSchema.safeParse(validButton);
      assert.ok(result.success);
    });

    test("Button schema should reject button without icon", () => {
      const ButtonSchema = z.object({
        icon: z.string().nonempty("Icon is required"),
        color: z.string().min(1, "Color must not be empty"),
        text: z.string().optional(),
        directory: z.string().optional(),
        command: z.string().min(1, "Command must not be empty"),
      });

      const invalidButton = {
        color: "#00ffcc",
        command: "npm run dev",
      };

      const result = ButtonSchema.safeParse(invalidButton);
      assert.ok(!result.success);
    });

    test("Button schema should accept optional text field", () => {
      const ButtonSchema = z.object({
        icon: z.string().nonempty("Icon is required"),
        color: z.string().min(1, "Color must not be empty"),
        text: z.string().optional(),
        directory: z.string().optional(),
        command: z.string().min(1, "Command must not be empty"),
      });

      const validButton = {
        icon: "rocket",
        color: "#00ffcc",
        command: "npm run dev",
      };

      const result = ButtonSchema.safeParse(validButton);
      assert.ok(result.success);
    });
  });

  suite("Integration Tests", () => {
    const createTestConfig = (config: object) => {
      if (!testWorkspaceRoot) {
        throw new Error("No workspace folder found");
      }
      const configPath = path.join(testWorkspaceRoot, ".command-buttons.json");
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    };

    const deleteTestConfig = () => {
      if (!testWorkspaceRoot) {
        return;
      }
      const configPath = path.join(testWorkspaceRoot, ".command-buttons.json");
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    };

    let mockContext: vscode.ExtensionContext;

    setup(() => {
      mockContext = {
        subscriptions: [],
      } as any;
    });

    teardown(() => {
      clearStatusBarButtons();
      deleteTestConfig();
    });

    test("Should read config and create buttons end-to-end", () => {
      const validConfig = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            text: "Dev",
            command: "npm run dev",
          },
          {
            icon: "package",
            color: "orange",
            text: "Build",
            command: "npm run build",
          },
        ],
      };

      createTestConfig(validConfig);
      const buttons = readConfig();

      assert.ok(buttons);
      assert.strictEqual(buttons.length, 2);

      createStatusBarButtons(buttons, mockContext);

      // Should have 2 subscriptions per button (item + command)
      assert.strictEqual(mockContext.subscriptions.length, 4);
    });

    test("Should handle config reload", () => {
      // First config
      const config1 = {
        buttons: [
          {
            icon: "rocket",
            color: "#00ffcc",
            text: "Dev",
            command: "npm run dev",
          },
        ],
      };

      createTestConfig(config1);
      const buttons1 = readConfig();
      assert.ok(buttons1);
      createStatusBarButtons(buttons1, mockContext);

      // Clear and reload with different config
      clearStatusBarButtons();

      const config2 = {
        buttons: [
          {
            icon: "package",
            color: "orange",
            text: "Build",
            command: "npm run build",
          },
          {
            icon: "beaker",
            color: "green",
            text: "Test",
            command: "npm test",
          },
        ],
      };

      createTestConfig(config2);
      const buttons2 = readConfig();
      assert.ok(buttons2);
      assert.strictEqual(buttons2.length, 2);
      createStatusBarButtons(buttons2, mockContext);
    });
  });
});
