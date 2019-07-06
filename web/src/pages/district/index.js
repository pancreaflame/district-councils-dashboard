import React, { Component } from 'react'
import Typography from '@material-ui/core/Typography'
import Box from '@material-ui/core/Box'
import OLMap from '../../components/OLMap'
import gql from 'graphql-tag'
import { Query } from 'react-apollo'
import DistrictCard from 'components/district/DistrictCard'
import MainAreas from 'components/district/MainAreas'
import CandidateList from 'components/district/CandidateList'
import styled from 'styled-components'
import { bps } from 'utils/responsive'

const GET_DISTRICTS = gql`
  query($year: Int!, $code: String!) {
    dc_constituencies(where: { year: { _eq: $year }, code: { _eq: $code } }) {
      name_zh
      name_en
      code
      deviation_percentage
      expected_population
      main_areas
      candidates {
        candidate_number
        person {
          name_zh
          name_en
        }
        vote_percentage
        votes
        is_won
      }
    }
  }
`

const FullWidthBox = styled(Box)`
  && {
    padding-top: 60px;
    width: 100%;
  }
`

const LowerBackgroundContainer = styled(Box)`
  && {
    width: 100vw;
    position: relative;
    margin-left: -50vw;
    left: 50%;
    background-color: #fafafa;
  }
`

const FlexRowContainer = styled(Box)`
  && {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    ${bps.up('md')} {
      width: 100%;
    }

    ${bps.up('lg')} {
      width: 1440px;
    }
    margin: auto;
  }
`

class DistrictPage extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    //  if (this.props.route.path === nextProps.route.path) return false;
    return true
  }

  handleChangeDistrict = (year, code) => {
    if (!year || !code) return
    this.props.history.push(`/district/${year}/${code}`)
  }

  onPrevElection() {
    const {
      match: {
        params: { year, code },
      },
    } = this.props
    this.props.history.push(`/district/${parseInt(year, 10) - 4}/${code}`)
  }

  onNextElection() {
    const {
      match: {
        params: { year, code },
      },
    } = this.props
    this.props.history.push(`/district/${parseInt(year, 10) + 4}/${code}`)
  }

  render() {
    const {
      match: {
        params: { year, code },
      },
    } = this.props

    return (
      <>
        <FlexRowContainer>
          <Box
            width={{ sm: '100%', md: '960px' }}
            height={{ sm: '300px', md: '400px' }}
          >
            <OLMap
              year={year}
              code={code}
              changeDistrict={this.handleChangeDistrict}
            />
          </Box>
          <Query query={GET_DISTRICTS} variables={{ year, code }}>
            {({ loading, error, data }) => {
              if (loading) return null
              if (error) return `Error! ${error}`
              const district = data.dc_constituencies[0]

              return (
                <>
                  <Box
                    p={0}
                    paddingLeft="30px"
                    width={{ sm: '100%', md: '400px' }}
                    height={{ sm: '300px', md: '400px' }}
                  >
                    <DistrictCard
                      {...district}
                      year={parseInt(year, 10)}
                      code={code}
                      onNextElection={this.onNextElection.bind(this)}
                      onPrevElection={this.onPrevElection.bind(this)}
                    />
                  </Box>
                  <FullWidthBox>
                    <MainAreas areas={district.main_areas || []} />
                  </FullWidthBox>
                  <LowerBackgroundContainer>
                    <FlexRowContainer>
                      <FullWidthBox>
                        <Typography variant="h5" bold gutterBottom>
                          人口資料
                        </Typography>
                        {district.expected_population}
                      </FullWidthBox>
                      <FullWidthBox>
                        <CandidateList
                          candidates={district.candidates}
                          year={parseInt(year, 10)}
                          code={code}
                        />
                      </FullWidthBox>
                    </FlexRowContainer>
                  </LowerBackgroundContainer>
                </>
              )
            }}
          </Query>
        </FlexRowContainer>
      </>
    )
  }
}

export default DistrictPage
