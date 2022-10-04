terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.33.0"
    }
  }

  backend "s3" {
    bucket = "caa-infra"
    key    = "terraform/state.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {}

# Organization accounts
module "account" {
  for_each = var.accounts

  source = "./modules/account"
  email  = each.value.email
  name   = each.value.name
  ou_id  = "ou-zgnu-4duq6vdo"
}

# SSO/Identity store setup
resource "aws_ssoadmin_permission_set" "learn" {
  name             = "LearningAccess"
  instance_arn     = local.instance_arn
  session_duration = "PT4H"
  relay_state      = "https://eu-west-1.console.aws.amazon.com/console/home?region=eu-west-1#"
}

resource "aws_identitystore_group" "students" {
  display_name      = "Students"
  description       = "Group for CAA students"
  identity_store_id = local.instance_id
}

# Students
module "student" {
  for_each = var.students

  source         = "./modules/student"
  account_id     = each.value.account_id
  email          = each.value.email
  group_id       = aws_identitystore_group.students.group_id
  first_name     = each.value.first_name
  last_name      = each.value.last_name
  instance_id    = local.instance_id
  permission_set = aws_ssoadmin_permission_set.learn
}
