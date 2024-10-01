terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "caa-infra"
    key    = "terraform/state.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region  = "eu-west-1"
  profile = "caa"
}

module "account" {
  # We are hardcoding the number of accounts rather than dynamically 
  # deducing it based on the number of users because closing an AWS account
  # is a more complex operation that doesn't release the root email address.
  count = 91

  source = "../modules/account"
  # The student53 account was deleted. We cannot use that email address again.
  email = count.index == 52 ? "student${count.index + 1}-1@caacourse.com" : "student${count.index + 1}@caacourse.com"
  # The old accounts had the format "Student 1-5" and "student6-61". There was also an old account for student75.
  # The new format is "CAA <nr>"
  name  = count.index < 61 || count.index == 74 ? count.index < 5 ? "Student ${count.index + 1}" : "student${count.index + 1}" : "CAA ${count.index + 1}"
  ou_id = "ou-zgnu-4duq6vdo"
}

# SSO/Identity store setup
resource "aws_ssoadmin_permission_set" "learn" {
  name             = "LearningAccess"
  instance_arn     = local.instance_arn
  session_duration = "PT4H"
  relay_state      = "https://eu-west-1.console.aws.amazon.com/console/home?region=eu-west-1#"
}

resource "aws_ssoadmin_managed_policy_attachment" "this" {
  instance_arn       = local.instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  permission_set_arn = aws_ssoadmin_permission_set.learn.arn
}

resource "aws_identitystore_group" "teachers" {
  display_name      = "Teachers"
  description       = "Group for CAA teachers"
  identity_store_id = local.instance_id
}

resource "aws_identitystore_group" "students" {
  display_name      = "Students"
  description       = "Group for CAA students"
  identity_store_id = local.instance_id
}

# Teachers
module "teacher" {
  for_each = var.teachers

  source         = "../modules/student"
  account_ids    = each.value.account_ids
  email          = each.value.email
  group_id       = aws_identitystore_group.teachers.group_id
  first_name     = each.value.first_name
  last_name      = each.value.last_name
  instance_id    = local.instance_id
  permission_set = aws_ssoadmin_permission_set.learn
}

# Students
module "student" {
  for_each = local.students

  source         = "../modules/student"
  account_ids    = [module.account[parseint(each.key, 10) - 1].account_id]
  email          = each.value.emailstud
  group_id       = aws_identitystore_group.students.group_id
  first_name     = title(lower(each.value.Prenume))
  last_name      = title(lower(each.value.Nume))
  instance_id    = local.instance_id
  permission_set = aws_ssoadmin_permission_set.learn
}
