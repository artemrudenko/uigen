Pull the latest changes from the remote server and ensure the project is ready to work with.

Do the following:
1. Run `git fetch --all` to fetch latest refs from all remotes
2. Run `git status` to check for uncommitted local changes
3. If there are uncommitted changes, stash them with `git stash` before pulling
4. Run `git pull --rebase` to pull and rebase on top of remote changes
5. If there were stashed changes, restore them with `git stash pop` and report any conflicts
6. Run `npm install` to sync dependencies in case package.json changed
7. Run `npx prisma generate` to regenerate the Prisma client in case the schema changed
8. Run tests to verify everything works after the pull
9. Report a summary of what changed (new commits pulled, dependency updates, any conflicts)
