# Task 5c - Data Import API Route

## Summary
Created POST /api/settings/import route that imports data from a previously exported JSON file back into the database.

## File Created
- `/home/z/my-project/src/app/api/settings/import/route.ts`

## Key Implementation Details
1. **Validation**: Checks userId, data, and user existence before import
2. **Field stripping**: Removes id, createdAt, updatedAt from each item so Prisma generates new ones
3. **userId override**: All items get the request's userId, not the original
4. **HabitLogs skipped**: Since habit IDs change on import, old habitId references are invalid
5. **Settings handled specially**: Uses individual create() calls to gracefully skip duplicates (unique constraint on userId+key)
6. **Error isolation**: Each collection type wrapped in try/catch, failures don't stop other imports
7. **No skipDuplicates**: SQLite doesn't support this Prisma option, removed it

## Test Results
- Missing userId → 400
- Missing data → 400
- Nonexistent user → 400
- Valid import → 200 with import counts
- Empty data → 200 with all 0s
- Lint passes cleanly
