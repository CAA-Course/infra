variable "teachers" {
  type = map(object({
    email       = string
    first_name  = string
    last_name   = string
    account_ids = list(string)
  }))
}

variable "students_path" {
  type = string
}

variable "students_region" {
  type    = string
  default = "eu-north-1"
}
