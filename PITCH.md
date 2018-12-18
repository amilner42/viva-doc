# Pitch

###### Terms

- d/c : docs or comments
- dco(s) : doc or comment owner(s)
- dci : doc or comment identity

###### What’s the problem?

- docs/comments (d/c) get outdated
- it becomes hard for people to figure out what part of d/c are true, who to ask, etc.
    - People often say with shitty docs that they made it even worse than no docs at all
      because it leads them the wrong way or onto an older version of the docs.
- all docs become shitty eventually if they’re not updated
- people switch teams / get fired and leave comment legacies

###### Who is effected by this problem? Who is the audience and how big is the audience?

- pretty much the bigger the company the worse this problem gets, including temporal size as old comments can be terrible
- open source projects and projects with lots of contributors also equally begin to suffer from this problem
- everyone uses github, we can plug into github for public/private repos
    - to acquire more customers it's critical to allow existing codebases to join and not just new projects, so the
      app has to work retroactively

##### What are the industries current solutions?

- when someone notices an issue, they usually file an issue on github and at some point someone reviews it and merges it
  with whatever branch they're on, eventually that branch gets merged back into master and possibly deployed to some
  auto-doc-generator upon deploy
- when people push new code, any decent company will have code review, and in that code review people will often
  force others to write docs on new functions
  - the issue is not brand new functions (usually) but modifying existing functions

##### How much do the current solutions suck compared to your solution, what's the potential impact of your solution? Is this a 10x improvement?

The horror stories of terrible documentation are ubiquitous. Getting people to properly document code has always been
a struggle. Part of the issue is that code changes so frequently so people feel they are wasting time if they spend
too much time documenting things, OTOH when people don't document enough a huge amount of time is wasted struggling
with poor documentation; laziness and deadlines are big factors towards poor documentation as well.

There doesn't seem to be any direct challenge to this app, it's experimenting in a new direction.

With the large amount of poor documentation, it's a market with billions of dollars of opportunity. It would be
valuable to try to quantify the impact of the app through feedback from the users, although it may be difficult to
accurately quantify the hours saved.


###### What’s The result of a nice solution?

- d/c become outdated less
    - when code is updated the respective d/c-owner (dco) will have to verify that the d/c have been updated, this
      is the active way we keep d/c up to date.
    - so similar to tests failing, until d/c have been verified by dcos things cannot be pushed
- when d/c are outdated it’s more clear who to ask
    - dco are responsible for their comments always
    - The result of clarifying the comment gets put into the comment shortly, a TODO is created at minimum. We don't
      want another person getting screwed by the same misunderstanding of the comment.
        - This way even if d/c fixes aren't merged people can see the fixes without digging through issues/PRs.
- when people switch teams / get fired they can port their comments to another owner so there is always an active dco
- people are credited for their work, so good dcos are recognized
    - could be used to show managers that people are spending time to d/c things well
    - could try to show the value of good d/c buy buttons like:
        - "saved me X hours"
        - upvote/downvote

###### What are the MVP features?

- app integrates with github repos
    - it mirrors your apps branches, at minimum the latest commit of each branch must be viewable
    - at minimum the main languages [java, c/c++, python, javascript] are supported
- app allows push-prevention if dcos haven't verified changes
- app must be able to keep track of dci
- app allows questions / threads on d/c
- app allows people to re-assign dco
    - including nice function for people moving and needing to reassign all their d/c
- app allows people to upvote/downvote/thank/"saved me x hours" peoples dco or comment on VivaDoc threads
    - app allows

###### What are other features?

- support almost every language (including config languages or DSLs like docker files)
- allow d/c fixes to directly create PRs and even be merged by the dco through the app

###### What is the time to build the MVP?

With school and just me working, maybe 4 - 6 months if I can put in like 15-20 hours per week while Im in school
then full-time after.

- depends on how hard it is to track dci, it's possible it's quite a difficult problem.

###### What are the possible sources of revenue?

- plans for individuals/organizations similar to github itself (top choice)
    - possibly free for OS projects
- advertisements (don't like it but it may be a good option)
    - possibly with tiers to pay to remove advertisements
