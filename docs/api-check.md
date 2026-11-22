# Comments API check

Run against the local server (`npm run dev`) after `npm run seed`, on 2026-11-22.
Every request that changes data sends `X-User-Id` (the demo sign-in; not real security).

| # | Request | Expected | Got |
|---|---|---|---|
| 1 | `GET /api/events/sample-hackville/comments` | 200, oldest first, `total` = 4 | OK (A. Patel, M. Olarte reply, J. Chen, R. Singh) |
| 2 | `POST` a comment with **no** `X-User-Id` | 401 | 401 "Please sign in first" |
| 3 | `POST` as `u_srivera`, text `"  Is there parking?  "` | 201, text trimmed, `is_mine: true` | 201, `"Is there parking?"` |
| 4 | `POST` with only spaces | 400 | 400 "Please write something before posting." |
| 5 | `POST` with 501 characters | 400 | 400 "at most 500 characters" |
| 6 | `POST` on an unknown event | 404 | 404 "Event not found." |
| 7 | `PATCH` that comment as **`u_apatel`** (not the author) | **403** | **403** "You can only change your own comments." |
| 8 | `PATCH` as the author | 200, `is_edited: true`, new `updated_at` | 200, `is_edited: true` |
| 9 | `DELETE` as **`u_apatel`** (not the author) | **403** | **403** |
| 10 | `DELETE` as the author | 204 | 204 |
| 11 | `DELETE` the same comment again | 404 | 404 "Comment not found." |

## Example commands

```bash
# Read
curl localhost:3000/api/events/sample-hackville/comments

# Create
curl -X POST localhost:3000/api/events/sample-hackville/comments \
  -H "Content-Type: application/json" -H "X-User-Id: u_srivera" \
  -d '{"comment_text":"Is there parking?"}'

# Update (someone else's comment gives 403)
curl -X PATCH localhost:3000/api/comments/<comment_id> \
  -H "Content-Type: application/json" -H "X-User-Id: u_srivera" \
  -d '{"comment_text":"Is there parking on campus?"}'

# Delete
curl -X DELETE localhost:3000/api/comments/<comment_id> -H "X-User-Id: u_srivera"
```

## Notes
- `user_id` is always taken from the header, never from the request body, so nobody can post as someone else.
- A reply sends `parent_id` (a top-level comment on the same event). If a parent is deleted, its replies stay; the app treats a reply with a missing parent as a normal comment.
