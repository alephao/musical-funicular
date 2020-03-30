import {ReginaldDSL} from './ReginaldDSL'
import {CommentBuilder} from './CommentBuilder'
import {CommentService} from './commentService'
import * as Webhooks from '@octokit/webhooks'

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor

export interface ReginaldRunner {
  run: () => Promise<void>
}

const makeRunner = (
  dsl: ReginaldDSL,
  reginaldfileContent: string,
  done: () => Promise<void>
): ReginaldRunner => {
  const run = new AsyncFunction('reginald', reginaldfileContent)

  return {
    run: async () => {
      await run(dsl)
      await done()
    }
  }
}

export const runnerFactory = (
  commentBuilder: CommentBuilder,
  commentService: CommentService,
  pullRequest: Webhooks.WebhookPayloadPullRequestPullRequest
): ((
  reginaldCommentId: string,
  reginaldfileContent: string
) => ReginaldRunner) => {
  return (reginaldCommentId, reginaldfileContent) => {
    const dsl: ReginaldDSL = {
      message: (body: string) => commentBuilder.addMessage(body),
      warning: (body: string) => commentBuilder.addWarning(body),
      error: (body: string) => commentBuilder.addError(body),
      pr: pullRequest
    }

    const done = async (): Promise<void> => {
      const commentBody = commentBuilder.build(reginaldCommentId)
      await commentService.createOrUpdateOrDeleteComment(
        reginaldCommentId,
        commentBody
      )
    }

    return makeRunner(dsl, reginaldfileContent, done)
  }
}
