-- name: InsertGroup :exec
INSERT INTO moment_groups (id, label, started_at, ended_at, created_at)
VALUES (?, ?, ?, ?, ?);

-- name: InsertGroupMember :exec
INSERT OR IGNORE INTO moment_group_members (moment_id, group_id)
VALUES (?, ?);

-- name: UpdateGroupBounds :exec
UPDATE moment_groups SET ended_at = ?, label = ? WHERE id = ?;

-- name: ListGroups :many
SELECT * FROM moment_groups ORDER BY started_at DESC;

-- name: FindGroupByStartRange :many
SELECT * FROM moment_groups WHERE started_at BETWEEN ? AND ? ORDER BY started_at ASC;

-- name: ListMembersByGroup :many
SELECT moment_id FROM moment_group_members WHERE group_id = ?;

-- name: ListAllGroupMembers :many
SELECT moment_id, group_id FROM moment_group_members;
