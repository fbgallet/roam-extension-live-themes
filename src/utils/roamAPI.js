// Minimal wrappers around window.roamAlphaAPI used by Live Themes.

export function getPageUidByTitle(title) {
  const r = window.roamAlphaAPI.data.pull("[:block/uid]", [":node/title", title]);
  return r ? r[":block/uid"] : null;
}

export async function getOrCreatePageUid(title) {
  let uid = getPageUidByTitle(title);
  if (uid) return uid;
  uid = window.roamAlphaAPI.util.generateUID();
  await window.roamAlphaAPI.data.page.create({ page: { title, uid } });
  return uid;
}

// Returns { uid, string, order, children: [...] } (keys without namespace)
export function getTreeByUid(uid) {
  if (!uid) return null;
  const res = window.roamAlphaAPI.q(
    `[:find (pull ?b [:block/uid :block/string :block/order {:block/children ...}])
      :where [?b :block/uid "${uid}"]]`
  );
  return res?.[0]?.[0] || null;
}

export function getOrderedChildren(node) {
  return (node?.children || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function getBlockString(uid) {
  if (!uid) return null;
  const r = window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uid]);
  return r ? r[":block/string"] : null;
}

export function isExistingBlock(uid) {
  if (!uid) return false;
  const r = window.roamAlphaAPI.data.pull("[:block/uid]", [":block/uid", uid]);
  return !!r;
}

export async function createBlock(parentUid, string = "", order = "last", { uid, open = true } = {}) {
  if (!uid) uid = window.roamAlphaAPI.util.generateUID();
  await window.roamAlphaAPI.data.block.create({
    location: { "parent-uid": parentUid, order },
    block: { string, uid, open },
  });
  return uid;
}

export async function moveBlock(uid, parentUid, order) {
  await window.roamAlphaAPI.data.block.move({
    location: { "parent-uid": parentUid, order },
    block: { uid },
  });
}

export async function updateBlockString(uid, string) {
  await window.roamAlphaAPI.data.block.update({ block: { uid, string } });
}

export async function deleteBlock(uid) {
  await window.roamAlphaAPI.data.block.delete({ block: { uid } });
}

export async function openPageInSidebar(pageUid) {
  await window.roamAlphaAPI.ui.rightSidebar.addWindow({
    window: { type: "outline", "block-uid": pageUid },
  });
}
