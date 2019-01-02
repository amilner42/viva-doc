# App

## The Problem

### What exactly is the problem we are trying to solve? (High-level)

Comments on top-level functions (sometimes used to gen docs) go out of date:
   - Comments also go out of date all over the place but top level comments
   tend to be the most problematic because they're what people who use your
   API are reading AND doc generators often use the top level docs.

Commenting code well is hard:
   - It takes a good chunk of time to document code well
      - You might not get anything "back" for it, does your manager know?
   - Code changes frequently
      - People forget to update comments when code is updated
      - How do you know which comments need updating?
   - People get fired / switch teams
      - And code gets pushed/merged without being properly commented.
   - What is a good comment? Hard to quantify.

### What does a solution to this problem absolutely require?

- Being minimal extra effort, people already don't doc code cause of the effort,
  a solution requiring to much effort won't even be used.
- Integration into existing projects (not just new projects)
    - An incremental approach that let's projects slowly absorb VD is critical for
    success, similar to how TS gained popularity by letting people slowly add
    TS to an existing project.

### What would be nice but not required in a solution?

- Being simple to understand
- Being simple to use during dev
- I worry about a "two sources of truth" issue, it may be essential that this app
  doesn't hold too much of it's own metadata but I'm not sure.
    - For instance, it may be better at certain points to put things in files such as
    `.vd-config` or something and have VD use that for config as opposed to having it
    saved in the VD db.

### Ignoring specifics, what can be done to solve the problem?

- Accountability:
    - Give people recognition for good quality comments
    - Hold people accountable for low quality comments
    - Make people accountable for the quality of comments over the entire life of the comment
- Assistance:
    - Automatically figure out which comments might be stale when code is updated

## The App

### What specifically will this app to do to solve the issue?

#### MVP

##### In the Code

On every comment you will be able to add a tag as so:

`@VD <githubHandle>`

```
// Some comment
// @VD amilner42
someFunction() {
  ...
}
```

This should be used on comments that are responsible for a chunk of code such as a type
declaration or most commonly a function.

This will mark that you are now **accountable** for that comment. If anyone is to push
changes to code assigned to that comment, then you will require approval from the
comment owner to get that code merged. Ideally this will be done on pull requests
automatically similar to tests and it will block the deploy (need to check what github
allows here, TODO link) until approval is given.

Code will be assigned to a comment based on what is expected given the language.
For instance, in python, the doc-sting under a function will automatically cover
that entire function.
 - There may be discrepancies so it will be valuable to provide extra meta-tags you can
   add to specify exactly what code is responsible for a comment. Such as `@VD <Until>`
   and `@VD <Add-START>` and `@VD <ADD-END>`. We will have to associate all the meta-tags
   with that comment. For this reason, and possibly other reasons, it could be valuable
   to demand that every comment has also a randomID: `@VD <githubHandle> <randomID>`.
   This is slightly more painful than just having the handle though, and perhaps will
   require a button on the web app to auto generate it with the randomID.

##### In the web app

###### The Organization Level

1. What is the estimated VD comment coverage.
1. Top documenters / Top teams (this might not be an MVP feature)
1. View organization goals and progress (this might not be an MVP feature)

###### The User Level

**Coder**

1. Upvote or downvote a comment, possibly more fine-grained such as an hours-saved or
   hours-lost option, with an optional comment.
    - Ideally we will be able to get to a comment in the web app through integration with
    the editor, similar to Dash in atom. You would just command-click the VD tag and it
    would send you to the web app.

1. See someone's profile page. Here you will be able to see:
    - How many comments are under their responsibility.
    - How old their account is
    - If they have other open source github repos they use VD on
    - It may be worth having per-project-stats and total-stats
    - How quickly do they approve comments?
    - How often do you get comment-approval with no feedback?

1. See TODO notifications for code changes you have to approve for comments that you own
    - If you don't approve of a change, you'll be able to write somewhere and ideally that
    comment gets written on the PR (this avoids 2 source of truths).
    - Once you approve you just tick a box and submit and again it'd be good if the PR got
    updated and if they get everyones approval the merge status gets set to OK.

1. See any issues or in progress PRs that have VD comments needing approval

1. See the goals related to you (this might not be an MVP feature)

**Admin**

1. Create goals (this might not be an MVP feature)
    - These can set a certain number of comments that a team or every member of a team
    must become responsible for by a certain date. You'll probably have to specify a
    branch from which to be counting.

1. Create barriers (this might not be an MVP feature)
    - This will allow you to force to have comments in a file forced to be watched under
    VD and functions to each have a comment. A no-comment comment will be a valid comment,
    simply: `// @VD amilner42` will signify that you don't need a comment and you are
    the owner of the code saying no comment is needed.
