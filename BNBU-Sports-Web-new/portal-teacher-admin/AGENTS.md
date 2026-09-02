# Local preview policy

For this project, all preview requests must use the local development server.
Do not use the Sites hosting, deployment, or publication workflow unless the
user explicitly asks to publish or deploy the site.

When asked to preview, run the project's normal local development command and
provide or open its local URL.

## Local preview workflow

1. From the repository root, ensure dependencies are installed with `npm install`
   when `node_modules` is missing or dependencies have changed.
2. Start the preview server with `npm run dev`.
3. Use the localhost URL printed by the server (normally `http://localhost:3000`)
   for all preview and browser-check requests.
4. Keep the development server running while preview work is in progress; stop it
   only after the user asks to stop it or the task has concluded.

## Feature change archiving

After completing any addition or removal of a feature, archive the completed
work with a Git commit before handing it off.

## End-of-task archive rule

At the end of every user task or conversation, before the final handoff:

1. Run `git status` and summarize the relevant changed files and their purpose.
2. Every archive commit message must include a concise summary of the changes
   being archived, grouped as additions, modifications, and deletions. Use this
   format: `存档: YYYY-MM-DD HH:MM｜新增: ...；修改: ...；删除: ...`.
   State `无` for any group that has no changes.
3. Archive all current project changes with a local Git commit, unless there are
   no changes to commit or the user explicitly asks not to archive them.
4. Use the current timestamp and replace every `...` in the required commit
   message format with the relevant change summary.
5. State clearly that the archive is local only and has not been pushed to
   GitHub unless the user explicitly requested a push.

## Git quick commands

Interpret the following Chinese phrases as explicit requests to perform the
corresponding Git operation. Unless the user names another project (for
example, `backend` or `Android`), operate in this repository.

### Status

When the user says `状态`, `看看改了什么`, `改了哪些`, or `有什么改动`, run:

```bash
git status
```

### Local archive

When the user says `存档`, `保存`, `存一下`, or `存个档`, save all changes to
the local Git repository with:

```bash
git add -A
git commit -m "存档: YYYY-MM-DD HH:MM｜新增: ...；修改: ...；删除: ..."
```

Use the current timestamp and replace every `...` with a concise change
description. Every archive commit message must explicitly cover `新增`, `修改`,
and `删除`; write `无` where applicable. Explain that this saves only to local
`.git` and does not upload to GitHub.

### Archive and push to GitHub

When the user says `提交`, `上传`, `推上去`, or `推到远程`, first verify that a
remote is configured with `git remote -v`. If no remote exists, tell the user
that they need to configure one. Otherwise run:

```bash
git add -A
git commit -m "提交: YYYY-MM-DD HH:MM｜新增: ...；修改: ...；删除: ..."
git push
```

Use the current timestamp and replace every `...` with a concise change
description. The commit message must explicitly cover `新增`, `修改`, and
`删除`; write `无` where applicable.

### Start a feature branch

When the user says `开发`, `新功能`, or `开始一个新功能` followed by a feature
name, update `main` and create a feature branch:

```bash
git checkout main
git pull
git checkout -b feat-feature-name
```

Use a concise lowercase, hyphenated English name. Translate Chinese feature
names as needed (for example, `搜索` becomes `feat-search`).

### Start a bug-fix branch

When the user says `修 bug` or `修复` followed by a bug description, update
`main` and create a fix branch:

```bash
git checkout main
git pull
git checkout -b fix-bug-description
```

Use a concise lowercase, hyphenated English description after the `fix-`
prefix.

### Merge a completed feature

When the user says `完成`, `合回去`, `合并到 main`, or `功能做完了`, first
identify the current branch with `git branch --show-current`. Then run:

```bash
git checkout main
git merge current-feature-branch
git branch -d current-feature-branch
```

If a merge conflict occurs, stop and ask the user to resolve it manually.

### Initialize a repository

When the user says `初始化 Git`, `创建仓库`, or `建一个 Git 仓库`, check whether
`.git` already exists. If it does not, ask for confirmation before running:

```bash
git init
git add -A
git commit -m "初始项目状态"
```

### History

When the user says `历史`, `提交记录`, `看看之前的版本`, or `log`, run:

```bash
git log --oneline -20
```
