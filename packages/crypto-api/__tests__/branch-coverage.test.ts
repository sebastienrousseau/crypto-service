/**
 * Tests targeting uncovered branches in utils/index.ts.
 *
 * Coverage targets:
 *   - Line 66: data.item is undefined/null (|| [] fallback)
 *   - Line 130: body.raw is undefined/null (?? "" fallback)
 *   - Line 140: form.src is undefined for file type (?? "" fallback)
 *   - Line 178: method.request.description is empty string (|| "" fallback)
 */
import { expect } from "chai";
import {
  createMarkdown,
  readFormDataBody,
  readMethods,
} from "../src/utils";
import type { JsonDocument } from "../src/@types/types";

describe("utils – branch coverage", () => {
  describe("createMarkdown – undefined item", () => {
    it("should handle data with no item property (line 66)", () => {
      const result = createMarkdown({
        info: { name: "Test", description: "desc" },
        // item is missing/undefined
      } as unknown as JsonDocument);
      expect(result).to.include("# Test");
      expect(result).to.include("desc");
    });

    it("should handle data with null item", () => {
      const result = createMarkdown({
        info: { name: "Test", description: "desc" },
        item: null as never,
      });
      expect(result).to.include("# Test");
    });
  });

  describe("readFormDataBody – undefined raw", () => {
    it("should handle raw mode with undefined raw content (line 130)", () => {
      const result = readFormDataBody({
        mode: "raw",
        raw: undefined,
      });
      expect(result).to.include("Body (**raw**)");
      expect(result).to.include("```json");
    });

    it("should handle raw mode with null raw content", () => {
      const result = readFormDataBody({
        mode: "raw",
        raw: null as unknown as string,
      });
      expect(result).to.include("Body (**raw**)");
    });
  });

  describe("readFormDataBody – file type with undefined src", () => {
    it("should handle file type form field with no src (line 140)", () => {
      const result = readFormDataBody({
        mode: "formdata",
        formdata: [
          { key: "avatar", type: "file", src: undefined },
        ],
      });
      expect(result).to.include("formdata");
      expect(result).to.include("avatar");
      expect(result).to.include("file");
    });
  });

  describe("readMethods – empty description", () => {
    it("should handle empty string description (line 178)", () => {
      const result = readMethods({
        name: "Test Endpoint",
        request: {
          description: "",
          method: "GET",
          url: "http://example.com",
          header: [],
          key: "",
          value: "",
        },
        response: [],
      });
      expect(result).to.include("GET Test Endpoint");
      // Empty description should produce "#\n\n"
      expect(result).to.include("#\n");
    });
  });
});
