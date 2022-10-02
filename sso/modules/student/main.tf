resource "aws_identitystore_user" "this" {
  identity_store_id = var.instance_id

  display_name = "${var.first_name} ${var.last_name}"
  user_name    = var.email

  name {
    given_name  = var.first_name
    family_name = var.last_name
  }

  emails {
    value   = var.email
    primary = true
  }
}

resource "aws_identitystore_group_membership" "this" {
  identity_store_id = var.instance_id
  group_id          = var.group_id
  member_id         = aws_identitystore_user.this.user_id
}

resource "aws_ssoadmin_account_assignment" "this" {
  instance_arn       = var.permission_set.instance_arn
  permission_set_arn = var.permission_set.arn

  principal_id   = aws_identitystore_user.this.user_id
  principal_type = "USER"

  target_id   = var.account_id
  target_type = "AWS_ACCOUNT"
}
