export const storageOptions = {
  notion_storage: "NOTION"
};

export const queryBody = {
  endpoint: "search",
  notionApiKey: "",
  body: {
    query: "",
    filter: {
      value: "database",
      property: "object"
    }
  }
};

/**
 * Creates a new command object with a default structure.
 * @returns {object} A new command object.
 */
export function createCommandBody() {
  return {
    parameters: {
      endpoint: "pages",
      apiKey: "",
      dbId: "",
      storageOption: "NOTION"
    },
    body: {
      mealName: "",
      mealTime: "",
      mealType: "",
      mealDescription: "",
      mealAudit: ""
    }
  };
};
