#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { Lab6Stack } from '../lib/lab6-stack';

const app = new cdk.App();
new Lab6Stack(app, 'Lab6Stack', { env: { region: 'eu-west-1' } });
