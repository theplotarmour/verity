# Verity Sync Guide: Porting Fixes from Veda

To prevent code drift and preserve commit history, we use the **Git Remote Cherry-Pick** workflow to backport bug fixes and feature updates from Veda to Verity. 

**Never use copy-paste, and never run direct directory copy overrides.**

---

## 1. Initial Local Setup (Run Once)

To link your local Verity repository to your local Veda repository, run the following command in the root of your `verity` directory:

```bash
git remote add veda D:/Code/veda
```

Verify that the remote has been added correctly:
```bash
git remote -v
# Should show:
# origin   https://github.com/theplotarmour/verity.git (fetch/push)
# veda     D:/Code/veda (fetch/push)
```

---

## 2. Sync Workflow

When a fix is committed to Veda, port it to Verity using these steps:

### Step 1: Fetch Veda Commits
From your active branch in `verity`, fetch the latest commits from the Veda remote:
```bash
git fetch veda
```

### Step 2: Identify the Commit Hash
Find the commit hash of the fix in Veda. You can view Veda's log from the Verity repo:
```bash
git log veda/main -n 10 --oneline
```

### Step 3: Cherry-Pick the Commit
Cherry-pick the specific commit into your active Verity branch:
```bash
git cherry-pick <commit-hash>
```

### Step 4: Resolve Naming Conflicts
If Git reports conflicts due to "Veda" vs "Verity" naming differences:
1. Open the conflicted files in your editor.
2. Resolve conflicts, ensuring "Verity" branding is preserved.
3. Add the files and complete the cherry-pick:
   ```bash
   git add <file-path>
   git cherry-pick --continue
   ```

---

## 3. Handling Mass Changes

If a large feature requires porting many contiguous commits:
1. Create a temporary feature branch.
2. Cherry-pick the range of commits:
   ```bash
   git cherry-pick <start-commit-hash>^..<end-commit-hash>
   ```
3. Open a PR to merge into `main`.
