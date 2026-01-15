resource "aws_instance" "web" {
  ami                    = "ami-0ecb62995f68bb549" # change for region
  instance_type          = "t2.large"
  key_name               = "project1"
  vpc_security_group_ids = [aws_security_group.jenkins_vm_sg.id]

  user_data = templatefile("${path.module}/install.sh", {})

  tags = {
    Name = "Jenkins-SonarQube"
  }

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }
}

resource "aws_security_group" "jenkins_vm_sg" {
  name        = "Jenkins-VM-SG"
  description = "Allow inbound traffic for Jenkins/SonarQube"

  dynamic "ingress" {
    for_each = toset([22, 80, 443, 8080, 9000, 3000])
    content {
      description = "Inbound port ${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"] # replace with your IP for better security
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "Jenkins-VM-SG"
  }
}
