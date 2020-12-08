import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Lab6 from '../lib/lab6-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Lab6.Lab6Stack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
