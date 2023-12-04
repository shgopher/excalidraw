import { Action, ActionResult } from "./types";
import { UndoIcon, RedoIcon } from "../components/icons";
import { ToolButton } from "../components/ToolButton";
import { t } from "../i18n";
import { History, HistoryEntry } from "../history";
import { ExcalidrawElement } from "../element/types";
import { AppState } from "../types";
import { KEYS } from "../keys";
import { arrayToMap } from "../utils";
import { isWindows } from "../constants";

const writeData = (
  // TODO: Could we get here map?
  prevElements: readonly ExcalidrawElement[],
  appState: AppState,
  updater: () => HistoryEntry | null,
): ActionResult => {
  const commitToStore = false;
  if (
    !appState.multiElement &&
    !appState.resizingElement &&
    !appState.editingElement &&
    !appState.draggingElement
  ) {
    // Iterate through the history entries in case they result in no visible changes
    // TODO: move somewhere else and test, if this never finishes / explodes, it will kill the whole experience
    do {
      // eslint-disable-next-line no-var
      var historyEntry = updater();
      if (historyEntry === null) {
        return { commitToStore };
      }

      // eslint-disable-next-line no-var
      var [
        [nextElementsMap, containsElementDifference],
        [nextAppState, containsAppStateDifference],
      ] = historyEntry.applyTo(arrayToMap(prevElements), appState);
    } while (
      !containsElementDifference &&
      !containsAppStateDifference &&
      historyEntry
    );

    // TODO: uncomment and test
    // fixBindingsAfterDeletion(elements, deletedElements);

    return {
      appState: nextAppState,
      elements: Array.from(nextElementsMap.values()),
      commitToStore,
      shouldOnlyUpdateSnapshot: true,
    };
  }
  return { commitToStore };
};

type ActionCreator = (history: History) => Action;

export const createUndoAction: ActionCreator = (history) => ({
  name: "undo",
  trackEvent: { category: "history" },
  perform: (elements, appState) =>
    writeData(elements, appState, () => history.undoOnce(arrayToMap(elements))),
  keyTest: (event) =>
    event[KEYS.CTRL_OR_CMD] &&
    event.key.toLowerCase() === KEYS.Z &&
    !event.shiftKey,
  PanelComponent: ({ updateData, data }) => (
    <ToolButton
      type="button"
      icon={UndoIcon}
      aria-label={t("buttons.undo")}
      onClick={updateData}
      size={data?.size || "medium"}
      disabled={history.isUndoStackEmpty}
    />
  ),
  commitToStore: () => false,
});

export const createRedoAction: ActionCreator = (history) => ({
  name: "redo",
  trackEvent: { category: "history" },
  perform: (elements, appState) =>
    writeData(elements, appState, () => history.redoOnce(arrayToMap(elements))),
  keyTest: (event) =>
    (event[KEYS.CTRL_OR_CMD] &&
      event.shiftKey &&
      event.key.toLowerCase() === KEYS.Z) ||
    (isWindows && event.ctrlKey && !event.shiftKey && event.key === KEYS.Y),
  PanelComponent: ({ updateData, data }) => (
    <ToolButton
      type="button"
      icon={RedoIcon}
      aria-label={t("buttons.redo")}
      onClick={updateData}
      size={data?.size || "medium"}
      disabled={history.isRedoStackEmpty}
    />
  ),
  commitToStore: () => false,
});
