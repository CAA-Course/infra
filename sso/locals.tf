data "aws_organizations_organization" "caa" {}

data "aws_ssoadmin_instances" "this" {}

locals {
  instance_id  = tolist(data.aws_ssoadmin_instances.this.identity_store_ids)[0]
  instance_arn = tolist(data.aws_ssoadmin_instances.this.arns)[0]
}

locals {
  students_data = jsondecode(file(var.students_path))
  students      = { for stud in local.students_data : stud.NrCrt => stud }
}
