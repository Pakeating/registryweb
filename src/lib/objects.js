export const storageOptions = {
  notion_storage: "NOTION"
};

export function createQueryBody() {
  return {
    parameters: {
      endpoint: "search",
      apiKey: "",
      dbId: "",
      storageOption: "NOTION",
      searchType: ""
    },
    body: {
      query: "",
      filter: {

      }
    }
  };
};

export function createDbIdQueryBody() {
  return {
    parameters: {
      endpoint: "search",
      apiKey: "",
      dbId: "",
      storageOption: "NOTION"
    },
    body: {
      query: "",
      filter: {
        value: "database",
        property: "object"
      }
    }
  };
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
