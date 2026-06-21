-- name: InsertMomentPerson :exec
INSERT INTO moment_people (id, moment_id, entry_id) VALUES (?, ?, ?);

-- name: ListPeopleByMoment :many
SELECT * FROM moment_people WHERE moment_id = ?;

-- name: ListMomentsByEntry :many
SELECT mp.moment_id FROM moment_people mp WHERE mp.entry_id = ? ORDER BY mp.moment_id DESC;

-- name: DeleteMomentPeople :exec
DELETE FROM moment_people WHERE moment_id = ?;
