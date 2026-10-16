<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Persist manually added chapters and removal markers in the Cloud database through `chapterDb.ts`; never keep chapter metadata in process memory, so worker restarts cannot lose the catalog.
- Chapter writes require a verified Google session and an administrator row in `public.user_roles`; legacy local admin sessions are presentation-only and cannot authorize database changes.
- Read persistent chapter records before chapter-cache lookups and include their state in cache keys so edits propagate across workers.
